from django.urls import reverse
from rest_framework import status
from unittest.mock import patch, MagicMock
from apps.base.tests import BaseTestCase
from apps.invoice.models import Invoice
from apps.payment.models import Payment, InvoicePayment, StripeConnectAccount
from apps.master.utils.text_choices import (
    InvoicePaymentStatus, PaymentStatus, StripeAccountStatus,
)


class InvoiceOnlineTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('invoice-list')

        # Create a valid Stripe Connect account for online payment tests
        self.connect_account = StripeConnectAccount.objects.create(
            business=self.business_a,
            stripe_account_id="acct_test_123",
            status=StripeAccountStatus.ACTIVE,
            charges_enabled=True,
            payouts_enabled=True,
            details_submitted=True,
        )

    def get_valid_payload(self, branch_id):
        return {
            "branch_id": branch_id,
            "payment_mode": "CASH",
            "customer": {
                "name": "New Customer",
                "mobile_number": "0987654321",
                "gender": "MALE",
                "age": 25,
                "email": "customer@example.com"
            },
            "invoice_items": [
                {
                    "product_id": self.product_a1.id,
                    "quantity": 2,
                    "base_price": "10.00",
                    "selling_price": "15.00"
                },
                {
                    "product_id": self.product_a2.id,
                    "quantity": 1,
                    "base_price": "20.00",
                    "selling_price": "25.00"
                }
            ]
        }

    @patch("apps.payment.services.stripe_service.StripeService.create_invoice_checkout_session")
    def test_initiate_online_invoice_payment(self, mock_checkout):
        """Test initiating an online invoice payment via Checkout Session."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Create Invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]

        # 2. Initiate Online Payment
        mock_session = MagicMock()
        mock_session.id = "cs_test_session_123"
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_session_123"
        mock_checkout.return_value = mock_session

        initiate_url = reverse('invoice-payment-initiate-online')
        response = self.client.post(
            initiate_url, {
                "invoice_id": invoice_id,
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            }, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn("checkout_url", response.data)
        self.assertIn("payment_id", response.data)

        # 3. Verify Payment record was created
        payment = Payment.objects.get(id=response.data["payment_id"])
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertTrue(InvoicePayment.objects.filter(payment=payment, invoice_id=invoice_id).exists())

    @patch("apps.payment.services.stripe_service.StripeService.construct_webhook_event")
    def test_webhook_marks_invoice_as_paid(self, mock_webhook):
        """Test that a checkout.session.completed webhook marks the invoice as paid."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Create Invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]

        # 2. Simulate Webhook
        mock_webhook.return_value = {
            "id": "evt_test_123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session_123",
                    "payment_intent": "pi_test_intent_123",
                    "metadata": {
                        "type": "INVOICE",
                        "invoice_id": str(invoice_id),
                        "connected_account_id": "acct_test_123",
                    }
                }
            }
        }
        webhook_url = reverse('stripe-webhook')
        response = self.client.post(
            webhook_url, {}, format='json',
            HTTP_STRIPE_SIGNATURE="mock_signature"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 3. Verify Invoice payment status updated
        invoice = Invoice.objects.get(id=invoice_id)
        self.assertEqual(invoice.payment_status, InvoicePaymentStatus.PAID)

    @patch("apps.payment.services.stripe_service.StripeService.construct_webhook_event")
    def test_webhook_failure_creates_failed_payment(self, mock_webhook):
        """Test that a payment_intent.payment_failed webhook creates a failed payment record."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Create Invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]

        # 2. Simulate Failure Webhook
        mock_webhook.return_value = {
            "id": "evt_test_fail_456",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_fail_txn_id",
                    "metadata": {
                        "type": "INVOICE",
                        "invoice_id": str(invoice_id),
                    }
                }
            }
        }
        webhook_url = reverse('stripe-webhook')
        response = self.client.post(
            webhook_url, {}, format='json',
            HTTP_STRIPE_SIGNATURE="mock_fail_signature"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 3. Invoice still exists (failures don't delete invoices)
        self.assertTrue(Invoice.objects.filter(id=invoice_id).exists())

        # 4. A failed payment record was created
        failed_payment = Payment.objects.filter(
            invoice_payment__invoice_id=invoice_id,
            status=PaymentStatus.FAILED,
        ).first()
        self.assertIsNotNone(failed_payment)

    def test_record_offline_payment(self):
        """Test recording an offline payment for an invoice."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Create Invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]

        # 2. Record Offline Payment
        offline_url = reverse('invoice-payment-record-offline')
        invoice = Invoice.objects.get(id=invoice_id)
        response = self.client.post(offline_url, {
            "invoice_id": invoice_id,
            "method": "CASH",
            "amount": str(invoice.total_amount),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        # 3. Verify invoice is marked as paid
        invoice.refresh_from_db()
        self.assertEqual(invoice.payment_status, InvoicePaymentStatus.PAID)
