from decimal import Decimal
from django.utils import timezone
from unittest.mock import patch

from apps.base.tests import BaseTestCase
from apps.payment.services.invoice_payment_service import InvoicePaymentService
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService
from apps.payment.models import Payment
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType
)


class InvoicePaymentServiceTestCase(BaseTestCase):
    """Test InvoicePaymentService for webhook handling."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_handle_success_creates_payment(self):
        """Test handle_success creates payment for invoice."""
        metadata = {
            "invoice_id": str(self.invoice_branch_a1.id),
            "connected_account_id": "acct_123",
        }
        
        InvoicePaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
            method=PaymentMethod.CARD,
        )
        
        self.assertTrue(Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.INVOICE,
        ).exists())

    def test_handle_failure_creates_failed_payment(self):
        """Test handle_failure creates failed payment."""
        metadata = {
            "invoice_id": str(self.invoice_branch_a1.id),
            "failure_reason": "Card declined",
        }
        
        InvoicePaymentService.handle_failure(
            metadata=metadata,
            transaction_id="pi_123",
        )
        
        self.assertTrue(Payment.objects.filter(
            status=PaymentStatus.FAILED,
            payment_type=PaymentType.INVOICE,
        ).exists())


class SubscriptionPaymentServiceTestCase(BaseTestCase):
    """Test SubscriptionPaymentService for webhook handling."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_handle_success_creates_subscription_payment(self):
        """Test handle_success creates subscription payment."""
        metadata = {
            "subscription_id": str(self.subscription_a.id),
        }
        
        SubscriptionPaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
        )
        
        self.assertTrue(Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.SUBSCRIPTION,
        ).exists())


class PaymentServiceIdempotencyTestCase(BaseTestCase):
    """Test idempotency of payment service operations."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_handle_success_idempotent(self):
        """Test that calling handle_success twice is safe."""
        metadata = {
            "invoice_id": str(self.invoice_branch_a1.id),
            "connected_account_id": "acct_123",
        }
        
        InvoicePaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
            method=PaymentMethod.CARD,
        )
        
        initial_count = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.INVOICE,
        ).count()
        
        # Call again
        InvoicePaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
            method=PaymentMethod.CARD,
        )
        
        final_count = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.INVOICE,
        ).count()
        
        # Count should remain dynamic and correct
        self.assertEqual(final_count, initial_count)
