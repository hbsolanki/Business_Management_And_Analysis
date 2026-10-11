import pytest
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


@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestPaymentModel:
    """Test Payment model creation, constraints, and relationships."""

    def test_payment_creation_success(self, env):
        """Test successful payment creation."""
        # Arrange & Act
        sut_payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_payment.id is not None
        assert sut_payment.business == env.business_a
        assert sut_payment.status == PaymentStatus.PENDING
        assert sut_payment.amount == Decimal("1000.00")

    def test_payment_with_all_fields(self, env):
        """Test payment creation with all optional fields."""
        # Arrange
        paid_at = timezone.now()
        
        # Act
        sut_payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.UPI,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("5000.00"),
            currency="INR",
            paid_at=paid_at,
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_payment.method == PaymentMethod.UPI
        assert sut_payment.status == PaymentStatus.SUCCEEDED
        assert sut_payment.paid_at == paid_at

    def test_payment_currency_default_is_inr(self, env):
        """Test payment currency defaults to INR."""
        # Arrange & Act
        sut_payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_payment.currency == "INR"

    def test_payment_status_transitions(self, env):
        """Test payment status can transition correctly."""
        # Arrange
        sut_payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        
        # Act
        sut_payment.status = PaymentStatus.SUCCEEDED
        sut_payment.paid_at = timezone.now()
        sut_payment.save()
        sut_payment.refresh_from_db()
        
        # Assert
        assert sut_payment.status == PaymentStatus.SUCCEEDED
        assert sut_payment.paid_at is not None

    def test_payment_amount_precision(self, env):
        """Test payment amount stores with correct decimal precision."""
        # Arrange & Act
        sut_payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("99.99"),
            created_by=env.owner_a
        )
        sut_payment.refresh_from_db()
        
        # Assert
        assert sut_payment.amount == Decimal("99.99")

    def test_payment_all_payment_types(self, env):
        """Test payment creation for all payment types."""
        # Arrange, Act & Assert
        for payment_type in [PaymentType.INVOICE, PaymentType.SUBSCRIPTION]:
            sut_payment = Payment.objects.create(
                business=env.business_a,
                payment_type=payment_type,
                method=PaymentMethod.CARD,
                status=PaymentStatus.PENDING,
                amount=Decimal("1000.00"),
                currency="INR",
                created_by=env.owner_a
            )
            assert sut_payment.payment_type == payment_type

    def test_payment_all_payment_methods(self, env):
        """Test payment creation for all payment methods."""
        # Arrange, Act & Assert
        for method in [PaymentMethod.CARD, PaymentMethod.UPI]:
            sut_payment = Payment.objects.create(
                business=env.business_a,
                payment_type=PaymentType.INVOICE,
                method=method,
                status=PaymentStatus.PENDING,
                amount=Decimal("1000.00"),
                currency="INR",
                created_by=env.owner_a
            )
            assert sut_payment.method == method

    def test_payment_all_statuses(self, env):
        """Test payment creation for all statuses."""
        # Arrange, Act & Assert
        for status in [PaymentStatus.PENDING, PaymentStatus.SUCCEEDED, 
                       PaymentStatus.FAILED, PaymentStatus.CANCELLED]:
            sut_payment = Payment.objects.create(
                business=env.business_a,
                payment_type=PaymentType.INVOICE,
                method=PaymentMethod.CARD,
                status=status,
                amount=Decimal("1000.00"),
                currency="INR",
                created_by=env.owner_a
            )
            assert sut_payment.status == status

    def test_payment_refunded_amount_calculation(self, env):
        """Test refunded_amount can be tracked."""
        # Arrange & Act
        sut_payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            refunded_amount=Decimal("200.00"),
            currency="INR",
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_payment.refunded_amount == Decimal("200.00")


@pytest.mark.django_db
class TestPaymentGatewayDetailModel:
    """Test PaymentGatewayDetail model."""

    def test_payment_gateway_detail_creation(self, env):
        """Test payment gateway detail creation."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=env.owner_a
        )
        
        # Act
        sut_gateway_detail = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="txn_test_123",
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_gateway_detail.payment == payment
        assert sut_gateway_detail.gateway == PaymentGateway.STRIPE

    def test_payment_gateway_with_stripe_fields(self, env):
        """Test PaymentGatewayDetail with Stripe-specific fields."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=env.owner_a
        )
        
        # Act
        sut_gateway = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="pi_test_123",
            stripe_connected_account_id="acct_test_123",
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_gateway.stripe_payment_intent_id == "pi_test_123"
        assert sut_gateway.stripe_connected_account_id == "acct_test_123"

    def test_gateway_detail_nullable_fields(self, env):
        """Test nullable fields in gateway detail."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=env.owner_a
        )
        
        # Act
        sut_gateway = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_gateway.stripe_payment_intent_id is None


@pytest.mark.django_db
class TestInvoicePaymentModel:
    """Test InvoicePayment model relationships."""

    def test_invoice_payment_creation(self, env):
        """Test InvoicePayment links Payment to Invoice."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=env.owner_a
        )
        invoice = env.invoice_branch_a1
        
        # Act
        sut_invoice_payment = InvoicePayment.objects.create(
            payment=payment,
            invoice=invoice,
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_invoice_payment.payment == payment
        assert sut_invoice_payment.invoice == invoice


@pytest.mark.django_db
class TestSubscriptionPaymentModel:
    """Test SubscriptionPayment model relationships."""

    def test_subscription_payment_creation(self, env):
        """Test SubscriptionPayment links Payment to Subscription."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.SUBSCRIPTION,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("499.00"),
            created_by=env.owner_a
        )
        subscription = env.subscription_a
        
        # Act
        sut_sub_payment = SubscriptionPayment.objects.create(
            payment=payment,
            subscription=subscription,
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_sub_payment.payment == payment
        assert sut_sub_payment.subscription == subscription

    def test_subscription_payment_string_representation(self, env):
        """Test subscription payment __str__ representation."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.SUBSCRIPTION,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("499.00"),
            created_by=env.owner_a
        )
        subscription = env.subscription_a
        sut_sub_payment = SubscriptionPayment.objects.create(
            payment=payment,
            subscription=subscription,
            created_by=env.owner_a
        )
        
        # Act
        str_repr = str(sut_sub_payment)
        
        # Assert
        assert "Subscription" in str_repr
        assert "Payment" in str_repr


@pytest.mark.django_db
class TestStripeConnectAccountModel:
    """Test StripeConnectAccount model creation and logic."""

    def test_stripe_connect_account_creation(self, env):
        """Test StripeConnectAccount model creation and custom property logic."""
        # Arrange
        sut_account = StripeConnectAccount.objects.create(
            business=env.business_a,
            stripe_account_id="acct_test_123",
            account_type=StripeAccountType.EXPRESS,
            status=StripeAccountStatus.PENDING,
            charges_enabled=False,
            created_by=env.owner_a
        )
        
        # Assert initial state
        assert sut_account.business == env.business_a
        assert sut_account.stripe_account_id == "acct_test_123"
        assert not sut_account.can_accept_payments

        # Act
        sut_account.charges_enabled = True
        sut_account.status = StripeAccountStatus.ACTIVE
        sut_account.save()
        
        # Assert updated state
        assert sut_account.can_accept_payments


@pytest.mark.django_db
class TestWebhookEventModel:
    """Test WebhookEvent model for idempotency."""

    def test_webhook_event_creation(self, env):
        """Test WebhookEvent creation with stripe_event_id."""
        # Arrange & Act
        sut_event = WebhookEvent.objects.create(
            stripe_event_id="evt_test_123",
            event_type="payment_intent.succeeded",
            raw_payload={"id": "evt_test_123", "type": "payment_intent.succeeded"},
            created_by=env.owner_a
        )
        
        # Assert
        assert sut_event.stripe_event_id == "evt_test_123"
        assert sut_event.event_type == "payment_intent.succeeded"

    def test_webhook_event_unique_stripe_event_id(self, env):
        """Test WebhookEvent prevents duplicate stripe_event_id."""
        # Arrange
        WebhookEvent.objects.create(
            stripe_event_id="evt_test_123",
            event_type="payment_intent.succeeded",
            raw_payload={},
            created_by=env.owner_a
        )
        
        # Act & Assert
        with pytest.raises(IntegrityError):
            WebhookEvent.objects.create(
                stripe_event_id="evt_test_123",
                event_type="payment_intent.failed",
                raw_payload={},
                created_by=env.owner_a
            )