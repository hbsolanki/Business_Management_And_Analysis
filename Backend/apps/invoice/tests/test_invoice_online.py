import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from apps.base.tests import BaseTestCase
from apps.invoice.models import Invoice
from apps.payment.models import Payment, InvoicePayment, StripeConnectAccount
from apps.master.utils.text_choices import (
    InvoicePaymentStatus, PaymentStatus, StripeAccountStatus,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def invoice_online_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()

    # Create a valid Stripe Connect account for online payment tests
    tc.connect_account = StripeConnectAccount.objects.create(
        business=tc.business_a,
        stripe_account_id="acct_test_123",
        status=StripeAccountStatus.ACTIVE,
        charges_enabled=True,
        payouts_enabled=True,
        details_submitted=True,
    )
    return tc


def get_valid_payload(branch_id, product_a1_id, product_a2_id):
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
                "product_id": product_a1_id,
                "quantity": 2,
                "base_price": "10.00",
                "selling_price": "15.00"
            },
            {
                "product_id": product_a2_id,
                "quantity": 1,
                "base_price": "20.00",
                "selling_price": "25.00"
            }
        ]
    }


@pytest.mark.django_db
class TestInvoiceOnlinePytest:

    @patch("apps.payment.services.stripe_service.StripeService.create_invoice_checkout_session")
    def test_initiate_online_invoice_payment(self, mock_checkout, api_client, invoice_online_env):
        """Test initiating an online invoice payment via Checkout Session."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_online_env.owner_a)
        sut_list_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_online_env.branch_a1.id, invoice_online_env.product_a1.id, invoice_online_env.product_a2.id)

        # 1. Create Invoice
        # Act
        create_res = sut_client.post(sut_list_url, sut_payload, format='json')
        # Assert
        assert create_res.status_code == status.HTTP_201_CREATED
        invoice_id = create_res.data["id"]

        # 2. Initiate Online Payment
        # Arrange
        mock_session = MagicMock()
        mock_session.id = "cs_test_session_123"
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_session_123"
        mock_checkout.return_value = mock_session
        sut_initiate_url = reverse('invoice-payment-initiate-online')

        # Act
        initiate_res = sut_client.post(
            sut_initiate_url, {
                "invoice_id": invoice_id,
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            }, format='json'
        )

        # Assert
        assert initiate_res.status_code == status.HTTP_201_CREATED, initiate_res.data
        assert "checkout_url" in initiate_res.data
        assert "payment_id" in initiate_res.data

        # 3. Verify Payment record was created
        payment = Payment.objects.get(id=initiate_res.data["payment_id"])
        assert payment.status == PaymentStatus.PENDING
        assert InvoicePayment.objects.filter(payment=payment, invoice_id=invoice_id).exists()

    @patch("apps.payment.services.stripe_service.StripeService.construct_webhook_event")
    def test_webhook_marks_invoice_as_paid(self, mock_webhook, api_client, invoice_online_env):
        """Test that a checkout.session.completed webhook marks the invoice as paid."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_online_env.owner_a)
        sut_list_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_online_env.branch_a1.id, invoice_online_env.product_a1.id, invoice_online_env.product_a2.id)

        # 1. Create Invoice
        # Act
        create_res = sut_client.post(sut_list_url, sut_payload, format='json')
        # Assert
        assert create_res.status_code == status.HTTP_201_CREATED
        invoice_id = create_res.data["id"]

        # 2. Simulate Webhook
        # Arrange
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
        sut_webhook_url = reverse('stripe-webhook')

        # Act
        webhook_res = sut_client.post(
            sut_webhook_url, {}, format='json',
            HTTP_STRIPE_SIGNATURE="mock_signature"
        )

        # Assert
        assert webhook_res.status_code == status.HTTP_200_OK
        invoice = Invoice.objects.get(id=invoice_id)
        assert invoice.payment_status == InvoicePaymentStatus.PAID

    @patch("apps.payment.services.stripe_service.StripeService.construct_webhook_event")
    def test_webhook_failure_creates_failed_payment(self, mock_webhook, api_client, invoice_online_env):
        """Test that a payment_intent.payment_failed webhook creates a failed payment record."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_online_env.owner_a)
        sut_list_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_online_env.branch_a1.id, invoice_online_env.product_a1.id, invoice_online_env.product_a2.id)

        # 1. Create Invoice
        # Act
        create_res = sut_client.post(sut_list_url, sut_payload, format='json')
        # Assert
        assert create_res.status_code == status.HTTP_201_CREATED
        invoice_id = create_res.data["id"]

        # 2. Simulate Failure Webhook
        # Arrange
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
        sut_webhook_url = reverse('stripe-webhook')

        # Act
        fail_res = sut_client.post(
            sut_webhook_url, {}, format='json',
            HTTP_STRIPE_SIGNATURE="mock_fail_signature"
        )

        # Assert
        assert fail_res.status_code == status.HTTP_200_OK
        assert Invoice.objects.filter(id=invoice_id).exists()
        failed_payment = Payment.objects.filter(
            invoice_payment__invoice_id=invoice_id,
            status=PaymentStatus.FAILED,
        ).first()
        assert failed_payment is not None

    def test_record_offline_payment(self, api_client, invoice_online_env):
        """Test recording an offline payment for an invoice."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_online_env.owner_a)
        sut_list_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_online_env.branch_a1.id, invoice_online_env.product_a1.id, invoice_online_env.product_a2.id)

        # 1. Create Invoice
        # Act
        create_res = sut_client.post(sut_list_url, sut_payload, format='json')
        # Assert
        assert create_res.status_code == status.HTTP_201_CREATED
        invoice_id = create_res.data["id"]

        # 2. Record Offline Payment
        # Arrange
        offline_url = reverse('invoice-payment-record-offline')
        invoice = Invoice.objects.get(id=invoice_id)

        # Act
        record_res = sut_client.post(offline_url, {
            "invoice_id": invoice_id,
            "method": "CASH",
            "amount": str(invoice.total_amount),
        }, format='json')

        # Assert
        assert record_res.status_code == status.HTTP_201_CREATED, record_res.data
        invoice.refresh_from_db()
        assert invoice.payment_status == InvoicePaymentStatus.PAID
