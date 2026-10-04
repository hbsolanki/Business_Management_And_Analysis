from decimal import Decimal
from django.utils import timezone
from django.db import IntegrityError

from apps.base.tests import BaseTestCase
from apps.payment.models import (
    Payment, PaymentGatewayDetail, InvoicePayment, SubscriptionPayment,
    StripeConnectAccount, WebhookEvent
)
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType, PaymentGateway,
    StripeAccountStatus, StripeAccountType
)


class PaymentModelTestCase(BaseTestCase):
    """Test Payment model creation, constraints, and relationships."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_payment_creation_success(self):
        """Test successful payment creation."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a
        )
        self.assertIsNotNone(payment.id)
        self.assertEqual(payment.business, self.business_a)
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertEqual(payment.amount, Decimal("1000.00"))

    def test_payment_with_all_fields(self):
        """Test payment creation with all optional fields."""
        paid_at = timezone.now()
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.UPI,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("5000.00"),
            currency="INR",
            paid_at=paid_at,
            created_by=self.owner_a
        )
        self.assertEqual(payment.method, PaymentMethod.UPI)
        self.assertEqual(payment.status, PaymentStatus.SUCCEEDED)
        self.assertEqual(payment.paid_at, paid_at)

    def test_payment_currency_default_is_inr(self):
        """Test payment currency defaults to INR."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        self.assertEqual(payment.currency, "INR")

    def test_payment_status_transitions(self):
        """Test payment status can transition correctly."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        payment.status = PaymentStatus.SUCCEEDED
        payment.paid_at = timezone.now()
        payment.save()
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.SUCCEEDED)
        self.assertIsNotNone(payment.paid_at)

    def test_payment_amount_precision(self):
        """Test payment amount stores with correct decimal precision."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("99.99"),
            created_by=self.owner_a
        )
        payment.refresh_from_db()
        self.assertEqual(payment.amount, Decimal("99.99"))

    def test_payment_all_payment_types(self):
        """Test payment creation for all payment types."""
        for payment_type in [PaymentType.INVOICE, PaymentType.SUBSCRIPTION]:
            payment = Payment.objects.create(
                business=self.business_a,
                payment_type=payment_type,
                method=PaymentMethod.CARD,
                status=PaymentStatus.PENDING,
                amount=Decimal("1000.00"),
                currency="INR",
                created_by=self.owner_a
            )
            self.assertEqual(payment.payment_type, payment_type)

    def test_payment_all_payment_methods(self):
        """Test payment creation for all payment methods."""
        for method in [PaymentMethod.CARD, PaymentMethod.UPI]:
            payment = Payment.objects.create(
                business=self.business_a,
                payment_type=PaymentType.INVOICE,
                method=method,
                status=PaymentStatus.PENDING,
                amount=Decimal("1000.00"),
                currency="INR",
                created_by=self.owner_a
            )
            self.assertEqual(payment.method, method)

    def test_payment_all_statuses(self):
        """Test payment creation for all statuses."""
        for status in [PaymentStatus.PENDING, PaymentStatus.SUCCEEDED, 
                       PaymentStatus.FAILED, PaymentStatus.CANCELLED]:
            payment = Payment.objects.create(
                business=self.business_a,
                payment_type=PaymentType.INVOICE,
                method=PaymentMethod.CARD,
                status=status,
                amount=Decimal("1000.00"),
                currency="INR",
                created_by=self.owner_a
            )
            self.assertEqual(payment.status, status)

    def test_payment_refunded_amount_calculation(self):
        """Test refunded_amount can be tracked."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            refunded_amount=Decimal("200.00"),
            currency="INR",
            created_by=self.owner_a
        )
        self.assertEqual(payment.refunded_amount, Decimal("200.00"))


class PaymentGatewayDetailModelTestCase(BaseTestCase):
    """Test PaymentGatewayDetail model."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_payment_gateway_detail_creation(self):
        """Test payment gateway detail creation."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=self.owner_a
        )
        gateway_detail = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="txn_test_123",
            created_by=self.owner_a
        )
        self.assertEqual(gateway_detail.payment, payment)
        self.assertEqual(gateway_detail.gateway, PaymentGateway.STRIPE)

    def test_payment_gateway_with_stripe_fields(self):
        """Test PaymentGatewayDetail with Stripe-specific fields."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=self.owner_a
        )
        gateway = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="pi_test_123",
            stripe_connected_account_id="acct_test_123",
            created_by=self.owner_a
        )
        self.assertEqual(gateway.stripe_payment_intent_id, "pi_test_123")
        self.assertEqual(gateway.stripe_connected_account_id, "acct_test_123")

    def test_gateway_detail_nullable_fields(self):
        """Test nullable fields in gateway detail."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=self.owner_a
        )
        gateway = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            created_by=self.owner_a
        )
        self.assertIsNone(gateway.stripe_payment_intent_id)


class InvoicePaymentModelTestCase(BaseTestCase):
    """Test InvoicePayment model relationships."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_invoice_payment_creation(self):
        """Test InvoicePayment links Payment to Invoice."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=self.owner_a
        )
        invoice = self.invoice_branch_a1
        
        invoice_payment = InvoicePayment.objects.create(
            payment=payment,
            invoice=invoice,
            created_by=self.owner_a
        )
        self.assertEqual(invoice_payment.payment, payment)
        self.assertEqual(invoice_payment.invoice, invoice)


class SubscriptionPaymentModelTestCase(BaseTestCase):
    """Test SubscriptionPayment model relationships."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_subscription_payment_creation(self):
        """Test SubscriptionPayment links Payment to Subscription."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.SUBSCRIPTION,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("499.00"),
            created_by=self.owner_a
        )
        subscription = self.subscription_a
        
        sub_payment = SubscriptionPayment.objects.create(
            payment=payment,
            subscription=subscription,
            created_by=self.owner_a
        )
        self.assertEqual(sub_payment.payment, payment)
        self.assertEqual(sub_payment.subscription, subscription)

    def test_subscription_payment_string_representation(self):
        """Test subscription payment __str__ representation."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.SUBSCRIPTION,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("499.00"),
            created_by=self.owner_a
        )
        subscription = self.subscription_a
        sub_payment = SubscriptionPayment.objects.create(
            payment=payment,
            subscription=subscription,
            created_by=self.owner_a
        )
        str_repr = str(sub_payment)
        self.assertIn("Subscription", str_repr)
        self.assertIn("Payment", str_repr)


class StripeConnectAccountModelTestCase(BaseTestCase):
    """Test StripeConnectAccount model creation and logic."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_stripe_connect_account_creation(self):
        """Test StripeConnectAccount model creation and custom property logic."""
        account = StripeConnectAccount.objects.create(
            business=self.business_a,
            stripe_account_id="acct_test_123",
            account_type=StripeAccountType.EXPRESS,
            status=StripeAccountStatus.PENDING,
            charges_enabled=False,
            created_by=self.owner_a
        )
        self.assertEqual(account.business, self.business_a)
        self.assertEqual(account.stripe_account_id, "acct_test_123")
        self.assertFalse(account.can_accept_payments)

        account.charges_enabled = True
        account.status = StripeAccountStatus.ACTIVE
        account.save()
        self.assertTrue(account.can_accept_payments)


class WebhookEventModelTestCase(BaseTestCase):
    """Test WebhookEvent model for idempotency."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_webhook_event_creation(self):
        """Test WebhookEvent creation with stripe_event_id."""
        event = WebhookEvent.objects.create(
            stripe_event_id="evt_test_123",
            event_type="payment_intent.succeeded",
            raw_payload={"id": "evt_test_123", "type": "payment_intent.succeeded"},
            created_by=self.owner_a
        )
        self.assertEqual(event.stripe_event_id, "evt_test_123")
        self.assertEqual(event.event_type, "payment_intent.succeeded")

    def test_webhook_event_unique_stripe_event_id(self):
        """Test WebhookEvent prevents duplicate stripe_event_id."""
        WebhookEvent.objects.create(
            stripe_event_id="evt_test_123",
            event_type="payment_intent.succeeded",
            raw_payload={},
            created_by=self.owner_a
        )
        
        with self.assertRaises(IntegrityError):
            WebhookEvent.objects.create(
                stripe_event_id="evt_test_123",
                event_type="payment_intent.failed",
                raw_payload={},
                created_by=self.owner_a
            )