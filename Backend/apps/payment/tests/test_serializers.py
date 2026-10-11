import pytest
from decimal import Decimal
from django.utils import timezone

from apps.base.tests import BaseTestCase
from apps.payment.serializers import (
    PaymentSerializer,
    InvoicePaymentSerializer,
    OfflineInvoicePaymentSerializer,
    RefundPaymentSerializer,
    SyncInvoicePaymentStatusSerializer,
)
from apps.payment.models import Payment, PaymentGatewayDetail, InvoicePayment
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType, PaymentGateway
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
class TestPaymentSerializer:
    """Test Payment serializer validation and creation."""

    def test_serialize_payment(self, env):
        """Test serializing a payment."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a
        )
        
        # Act
        sut_serializer = PaymentSerializer(payment)
        
        # Assert
        assert sut_serializer.data["id"] == payment.id
        assert sut_serializer.data["amount"] == "1000.00"
        assert sut_serializer.data["status"] == PaymentStatus.SUCCEEDED

    def test_payment_serializer_nested_gateway_detail(self, env):
        """Test payment serializer includes nested gateway detail."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a
        )
        gateway_detail = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="pi_123",
            created_by=env.owner_a
        )
        
        # Act
        sut_serializer = PaymentSerializer(payment)
        
        # Assert
        assert "gateway_detail" in sut_serializer.data
        assert sut_serializer.data["gateway_detail"]["id"] == gateway_detail.id


@pytest.mark.django_db
class TestInvoicePaymentSerializer:
    """Test InvoicePayment serializer."""

    def test_create_invoice_payment(self, env):
        """Test creating an invoice payment."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a
        )
        data = {
            "invoice_id": env.invoice_branch_a1.id,
            "payment_id": payment.id,
        }
        
        # Act
        sut_serializer = InvoicePaymentSerializer(data=data)
        
        # Assert
        assert sut_serializer.is_valid(), sut_serializer.errors
        invoice_payment = sut_serializer.save(created_by=env.owner_a)
        assert invoice_payment.invoice == env.invoice_branch_a1
        assert invoice_payment.payment == payment


@pytest.mark.django_db
class TestOfflineInvoicePaymentSerializer:
    """Test offline invoice payment serializer."""

    def test_create_offline_payment_cash(self, env):
        """Test creating offline CASH payment."""
        # Arrange
        data = {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": Decimal("10.00"),
            "notes": "Cash received",
        }
        
        # Act
        sut_serializer = OfflineInvoicePaymentSerializer(data=data)
        
        # Assert
        assert sut_serializer.is_valid(), sut_serializer.errors

    def test_offline_payment_invalid_amount(self, env):
        """Test offline payment with invalid amount."""
        # Arrange
        data = {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": Decimal("-100.00"),
        }
        
        # Act
        sut_serializer = OfflineInvoicePaymentSerializer(data=data)
        
        # Assert
        assert not sut_serializer.is_valid()


@pytest.mark.django_db
class TestInitiateSubscriptionPaymentSerializer:
    def test_initiate_subscription_payment_success(self, env):
        from apps.payment.serializers.subscription_payment.subscription_payment_initiate import InitiateSubscriptionPaymentSerializer
        from types import SimpleNamespace
        from unittest.mock import MagicMock, patch

        req = SimpleNamespace(user=env.owner_a)
        data = {
            "subscription_id": env.subscription_a.id,
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        }
        sut_ser = InitiateSubscriptionPaymentSerializer(data=data, context={"request": req})
        assert sut_ser.is_valid(), sut_ser.errors

        mock_cust = MagicMock(id="cus_123")
        mock_sess = MagicMock(url="https://checkout.stripe.com/pay/123")
        with patch("apps.payment.services.stripe_service.StripeService.get_or_create_customer", return_value=mock_cust), \
             patch("apps.payment.services.stripe_service.StripeService.create_subscription_checkout_session", return_value=mock_sess):
            res = sut_ser.save()
            assert res["checkout_url"] == "https://checkout.stripe.com/pay/123"
            assert res["subscription_id"] == env.subscription_a.id

    def test_initiate_subscription_payment_different_business(self, env):
        from apps.payment.serializers.subscription_payment.subscription_payment_initiate import InitiateSubscriptionPaymentSerializer
        from types import SimpleNamespace

        # Owner from business B
        req = SimpleNamespace(user=env.owner_b)
        data = {
            "subscription_id": env.subscription_a.id,
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        }
        sut_ser = InitiateSubscriptionPaymentSerializer(data=data, context={"request": req})
        assert sut_ser.is_valid() is False
        assert "subscription_id" in sut_ser.errors

    def test_initiate_subscription_payment_stripe_error(self, env):
        from apps.payment.serializers.subscription_payment.subscription_payment_initiate import InitiateSubscriptionPaymentSerializer
        from types import SimpleNamespace
        from unittest.mock import patch

        req = SimpleNamespace(user=env.owner_a)
        data = {
            "subscription_id": env.subscription_a.id,
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        }
        sut_ser = InitiateSubscriptionPaymentSerializer(data=data, context={"request": req})
        assert sut_ser.is_valid(), sut_ser.errors

        with patch("apps.payment.services.stripe_service.StripeService.get_or_create_customer", side_effect=Exception("Stripe down")):
            with pytest.raises(Exception):
                sut_ser.save()


@pytest.mark.django_db
class TestSyncConnectAccount:
    def test_sync_connect_account_lifecycle(self, env):
        from apps.payment.utils.connect_account import sync_connect_account
        from apps.payment.models import StripeConnectAccount
        from apps.master.utils.text_choices import StripeAccountStatus
        from types import SimpleNamespace

        account = StripeConnectAccount.objects.create(
            business=env.business_a,
            stripe_account_id="acct_sync_test",
            status=StripeAccountStatus.PENDING,
            created_by=env.owner_a,
        )

        # 1. Onboarding complete -> ACTIVE
        mock_stripe_active = SimpleNamespace(
            charges_enabled=True,
            payouts_enabled=True,
            details_submitted=True,
        )
        sync_connect_account(account, mock_stripe_active)
        account.refresh_from_db()
        assert account.status == StripeAccountStatus.ACTIVE
        assert account.charges_enabled is True
        assert account.onboarded_at is not None

        # 2. Charges disabled -> RESTRICTED
        mock_stripe_restricted = SimpleNamespace(
            charges_enabled=False,
            payouts_enabled=False,
            details_submitted=True,
        )
        sync_connect_account(account, mock_stripe_restricted)
        account.refresh_from_db()
        assert account.status == StripeAccountStatus.RESTRICTED

