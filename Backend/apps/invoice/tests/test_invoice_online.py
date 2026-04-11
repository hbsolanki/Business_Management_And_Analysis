from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from apps.base.tests import BaseTestCase
from apps.invoice.models import Invoice

class InvoiceOnlineTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('invoice-list')
        
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

    @patch("apps.base.services.stripe_service.StripeService.create_payment_intent")
    @patch("apps.base.services.stripe_service.StripeService.construct_webhook_event")
    def test_create_invoice_online_payment_full_flow(self, mock_webhook, mock_intent):
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Create Invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        payload["payment_mode"] = "ONLINE"
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]

        # 2. Create Payment Intent
        mock_intent.return_value = {"client_secret": "pi_mock_secret_123"}
        intent_url = reverse('invoice-payment-create-intent')
        response = self.client.post(intent_url, {"invoice_id": invoice_id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Failed at create-intent: {response.data}")
        self.assertEqual(response.data["clientSecret"], "pi_mock_secret_123")
        
        # 3. Simulate Webhook
        mock_webhook.return_value = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_mock_txn_id",
                    "metadata": {
                        "type": "INVOICE",
                        "invoice_id": invoice_id
                    }
                }
            }
        }
        webhook_url = reverse('stripe-webhook')
        response = self.client.post(
            webhook_url, 
            {}, 
            format='json', 
            HTTP_STRIPE_SIGNATURE="mock_signature"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Verify Database Update
        invoice = Invoice.objects.get(id=invoice_id)
        self.assertEqual(invoice.payment_mode, "ONLINE")
        self.assertEqual(invoice.transaction_id, "pi_mock_txn_id")
        self.assertIsNotNone(invoice.payment_date)

    def test_create_invoice_online_payment_simple(self):
        self.client.force_authenticate(user=self.owner_a)
        payload = self.get_valid_payload(self.branch_a1.id)
        payload["payment_mode"] = "ONLINE"
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["payment_mode"], "ONLINE")

    @patch("apps.base.services.stripe_service.StripeService.construct_webhook_event")
    def test_create_invoice_online_payment_failure(self, mock_webhook):
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Create Invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        payload["payment_mode"] = "ONLINE"
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]

        # 2. Simulate Failure Webhook
        mock_webhook.return_value = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_fail_txn_id",
                    "metadata": {
                        "type": "INVOICE",
                        "invoice_id": invoice_id
                    }
                }
            }
        }
        webhook_url = reverse('stripe-webhook')
        response = self.client.post(
            webhook_url, 
            {}, 
            format='json', 
            HTTP_STRIPE_SIGNATURE="mock_fail_signature"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Verify Invoice Deletion (as per handle_failure logic)
        self.assertFalse(Invoice.objects.filter(id=invoice_id).exists())
