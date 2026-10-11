import pytest
from decimal import Decimal
from django.utils import timezone
from unittest.mock import MagicMock, patch

from apps.base.tests import BaseTestCase
from apps.payment.services.invoice_payment_service import InvoicePaymentService
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService
from apps.payment.services.stripe_service import StripeService
from apps.payment.models import Payment, WebhookEvent
from apps.subscription.models import Subscription
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
class TestInvoicePaymentService:
    """Test InvoicePaymentService for webhook handling."""

    def test_handle_success_creates_payment(self, env):
        """Test handle_success creates payment for invoice."""
        # Arrange
        metadata = {
            "invoice_id": str(env.invoice_branch_a1.id),
            "connected_account_id": "acct_123",
        }
        
        # Act
        InvoicePaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
            method=PaymentMethod.CARD,
        )
        
        # Assert
        assert Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.INVOICE,
        ).exists()

    def test_handle_success_without_invoice_id(self):
        """Test handle_success returns early when no invoice_id is provided."""
        # Arrange
        metadata = {}

        # Act
        sut_res = InvoicePaymentService.handle_success(metadata, "pi_none")

        # Assert
        assert sut_res is None

    def test_handle_success_exception_logged(self, env):
        """Test handle_success catches and logs exceptions without raising."""
        # Arrange
        metadata = {"invoice_id": str(env.invoice_branch_a1.id)}

        # Act & Assert
        with patch("apps.payment.services.invoice_payment_service.WebhookInvoicePaymentSerializer", side_effect=Exception("DB boom")):
            InvoicePaymentService.handle_success(metadata, "pi_err")

    def test_handle_failure_creates_failed_payment(self, env):
        """Test handle_failure creates failed payment."""
        # Arrange
        metadata = {
            "invoice_id": str(env.invoice_branch_a1.id),
            "failure_reason": "Card declined",
        }
        
        # Act
        InvoicePaymentService.handle_failure(
            metadata=metadata,
            transaction_id="pi_123",
        )
        
        # Assert
        assert Payment.objects.filter(
            status=PaymentStatus.FAILED,
            payment_type=PaymentType.INVOICE,
        ).exists()

    def test_handle_failure_without_invoice_id(self):
        """Test handle_failure returns early when no invoice_id is provided."""
        # Arrange
        metadata = {}

        # Act
        sut_res = InvoicePaymentService.handle_failure(metadata)

        # Assert
        assert sut_res is None

    def test_handle_failure_exception_logged(self, env):
        """Test handle_failure catches and logs exceptions without raising."""
        # Arrange
        metadata = {"invoice_id": str(env.invoice_branch_a1.id)}

        # Act & Assert
        with patch("apps.payment.services.invoice_payment_service.WebhookInvoicePaymentSerializer", side_effect=Exception("DB fail boom")):
            InvoicePaymentService.handle_failure(metadata, "pi_err")


@pytest.mark.django_db
class TestSubscriptionPaymentService:
    """Test SubscriptionPaymentService for webhook handling."""

    def test_validate_metadata_cases(self, env):
        # Arrange
        sub = env.subscription_a
        
        # Act & Assert - none business_id passes
        SubscriptionPaymentService._validate_metadata(sub, {})
        
        # Act & Assert - matching business_id passes
        SubscriptionPaymentService._validate_metadata(sub, {"business_id": str(sub.business_id)})
        
        # Act & Assert - mismatch raises ValueError
        with pytest.raises(ValueError, match="Metadata business does not match"):
            SubscriptionPaymentService._validate_metadata(sub, {"business_id": "999999"})

    def test_init_event_none_event_id(self):
        # Arrange & Act
        event, should_process = SubscriptionPaymentService._init_event(None, "evt_type", "SUBSCRIPTION", 1)

        # Assert
        assert event is None
        assert should_process is True

    def test_complete_and_fail_event_helpers(self):
        # Arrange & Act - None events return safely
        SubscriptionPaymentService._complete_event(None)
        SubscriptionPaymentService._fail_event(None, "err")

        # Arrange with real event
        event = WebhookEvent.objects.create(
            stripe_event_id="evt_test_123",
            event_type="test.type",
            payment_type="SUBSCRIPTION",
        )

        # Act - complete
        SubscriptionPaymentService._complete_event(event)
        event.refresh_from_db()
        assert event.is_processed is True

        # Act - fail
        SubscriptionPaymentService._fail_event(event, "Something went wrong")
        event.refresh_from_db()
        assert event.error_message == "Something went wrong"

    def test_create_payment_record(self, env):
        # Arrange
        sub = env.subscription_a

        # Act - success status
        sut_payment = SubscriptionPaymentService._create_payment_record(
            subscription=sub,
            transaction_id="pi_sub_123",
            status=PaymentStatus.SUCCEEDED,
        )

        # Assert
        assert sut_payment.status == PaymentStatus.SUCCEEDED
        assert sut_payment.paid_at is not None

        # Act - failure status without transaction_id
        sut_fail_payment = SubscriptionPaymentService._create_payment_record(
            subscription=sub,
            transaction_id=None,
            status=PaymentStatus.FAILED,
        )

        # Assert
        assert sut_fail_payment.status == PaymentStatus.FAILED
        assert sut_fail_payment.failed_at is not None

    def test_handle_success_creates_subscription_payment(self, env):
        """Test handle_success creates subscription payment."""
        # Arrange
        metadata = {
            "subscription_id": str(env.subscription_a.id),
        }
        
        # Act
        SubscriptionPaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
        )
        
        # Assert
        assert Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.SUBSCRIPTION,
        ).exists()

    def test_handle_success_no_subscription_id(self):
        # Arrange & Act
        sut_res = SubscriptionPaymentService.handle_success({}, "pi_none")
        # Assert
        assert sut_res is None

    def test_handle_success_not_should_process(self, env):
        # Arrange
        metadata = {"subscription_id": str(env.subscription_a.id)}
        with patch.object(SubscriptionPaymentService, "_init_event", return_value=(None, False)):
            # Act
            sut_res = SubscriptionPaymentService.handle_success(metadata, "pi_test", event_id="evt_dup")
            # Assert
            assert sut_res is None

    def test_handle_success_with_user_notifications(self, env):
        # Arrange
        metadata = {
            "subscription_id": str(env.subscription_a.id),
            "user_id": str(env.owner_a.id),
        }

        # Act
        with patch("apps.payment.services.subscription_payment_service.send_notification") as mock_notif, \
             patch("apps.payment.services.subscription_payment_service.send_subscription_email.delay") as mock_email:
            SubscriptionPaymentService.handle_success(
                metadata=metadata,
                transaction_id="pi_with_user",
                event_id="evt_with_user",
            )
            # Assert
            assert mock_notif.called
            assert mock_email.called

    def test_handle_success_subscription_does_not_exist(self):
        # Arrange
        metadata = {"subscription_id": "999999"}

        # Act
        with patch.object(SubscriptionPaymentService, "_fail_event") as mock_fail:
            SubscriptionPaymentService.handle_success(
                metadata=metadata,
                transaction_id="pi_missing",
                event_id="evt_missing_sub",
            )
            # Assert
            mock_fail.assert_called_once()

    def test_handle_success_generic_exception(self, env):
        # Arrange
        metadata = {"subscription_id": str(env.subscription_a.id)}

        # Act & Assert
        with patch("apps.payment.services.subscription_payment_service.SubscriptionPaymentSuccessSerializer", side_effect=RuntimeError("Critical error")), \
             patch.object(SubscriptionPaymentService, "_fail_event") as mock_fail:
            with pytest.raises(RuntimeError):
                SubscriptionPaymentService.handle_success(
                    metadata=metadata,
                    transaction_id="pi_crash",
                    event_id="evt_crash",
                )
            mock_fail.assert_called_once()

    def test_handle_failure_cases(self, env):
        # Arrange - no subscription id
        assert SubscriptionPaymentService.handle_failure({}, "pi_1") is None

        # Arrange - not should process
        metadata = {"subscription_id": str(env.subscription_a.id)}
        with patch.object(SubscriptionPaymentService, "_init_event", return_value=(None, False)):
            assert SubscriptionPaymentService.handle_failure(metadata, "pi_2") is None

        # Arrange - missing subscription raises
        with pytest.raises(Subscription.DoesNotExist):
            SubscriptionPaymentService.handle_failure({"subscription_id": "999999"}, "pi_3")

        # Arrange - valid failure on inactive subscription
        now = timezone.now()
        sub_fail = Subscription.objects.create(
            business=env.business_a,
            plan=env.plan_a,
            plan_name="Fail Plan",
            price=100.0,
            duration_days=30,
            start_date=now,
            end_date=now + timezone.timedelta(days=30),
            is_active=False,
            is_trial=False,
            max_products=10,
            max_invoices=10,
            max_staff=2,
            max_branches=1,
        )
        SubscriptionPaymentService.handle_failure(
            metadata={"subscription_id": str(sub_fail.id)},
            transaction_id="pi_fail_ok",
            event_id="evt_fail_ok",
        )
        assert Payment.objects.filter(status=PaymentStatus.FAILED, payment_type=PaymentType.SUBSCRIPTION).exists()


@pytest.mark.django_db
class TestPaymentServiceIdempotency:
    """Test idempotency of payment service operations."""

    def test_handle_success_idempotent(self, env):
        """Test that calling handle_success twice is safe."""
        # Arrange
        metadata = {
            "invoice_id": str(env.invoice_branch_a1.id),
            "connected_account_id": "acct_123",
        }
        
        # Act 1
        InvoicePaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
            method=PaymentMethod.CARD,
        )
        
        initial_count = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.INVOICE,
        ).count()
        
        # Act 2 - Call again
        InvoicePaymentService.handle_success(
            metadata=metadata,
            transaction_id="pi_123",
            method=PaymentMethod.CARD,
        )
        
        final_count = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            payment_type=PaymentType.INVOICE,
        ).count()
        
        # Assert
        assert final_count == initial_count


class TestStripeService:
    """Test all Stripe API wrapper methods in StripeService."""

    def test_construct_webhook_event(self):
        # Arrange
        payload = b'{"id": "evt_123"}'
        sig_header = "t=123,v1=abc"
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = {"id": "evt_123"}
            # Act
            sut_event = StripeService.construct_webhook_event(payload, sig_header, secret="whsec_custom")
            # Assert
            assert sut_event["id"] == "evt_123"
            mock_construct.assert_called_once_with(payload, sig_header, "whsec_custom")

    def test_create_connect_account(self):
        # Arrange
        with patch("apps.payment.services.stripe_service.StripeConnectAccountInputSerializer") as mock_ser:
            mock_instance = mock_ser.return_value
            mock_instance.is_valid.return_value = True
            mock_instance.save.return_value = {"account_id": "acct_abc"}

            # Act
            sut_acc = StripeService.create_connect_account("user@example.com", "US")

            # Assert
            assert sut_acc["account_id"] == "acct_abc"
            mock_instance.save.assert_called_once()

    def test_create_account_link(self):
        # Arrange
        with patch("apps.payment.services.stripe_service.StripeAccountLinkInputSerializer") as mock_ser:
            mock_instance = mock_ser.return_value
            mock_instance.is_valid.return_value = True
            mock_instance.save.return_value = {"url": "https://stripe.com/onboard"}

            # Act
            sut_link = StripeService.create_account_link("acct_abc", "https://app/refresh", "https://app/return")

            # Assert
            assert sut_link["url"] == "https://stripe.com/onboard"

    def test_retrieve_account(self):
        # Arrange
        with patch("stripe.Account.retrieve") as mock_retrieve:
            mock_retrieve.return_value = {"id": "acct_123", "charges_enabled": True}

            # Act
            sut_acc = StripeService.retrieve_account("acct_123")

            # Assert
            assert sut_acc["id"] == "acct_123"

    def test_create_invoice_checkout_session(self):
        # Arrange
        with patch("stripe.checkout.Session.create") as mock_create:
            mock_create.return_value = {"id": "cs_test_123"}

            # Act - INR includes upi
            sut_session_inr = StripeService.create_invoice_checkout_session(
                invoice_id=1,
                amount_in_cents=10000,
                currency="INR",
                connected_account_id="acct_dest",
                platform_fee_in_cents=500,
                success_url="https://app/success",
                cancel_url="https://app/cancel",
                customer_email="cust@example.com",
            )

            # Assert
            assert sut_session_inr["id"] == "cs_test_123"
            _, kwargs = mock_create.call_args
            assert "upi" in kwargs["payment_method_types"]
            assert kwargs["customer_email"] == "cust@example.com"

            # Act - USD card only, without email
            StripeService.create_invoice_checkout_session(
                invoice_id=2,
                amount_in_cents=20000,
                currency="USD",
                connected_account_id="acct_dest2",
                platform_fee_in_cents=1000,
                success_url="https://app/success",
                cancel_url="https://app/cancel",
            )
            _, kwargs2 = mock_create.call_args
            assert kwargs2["payment_method_types"] == ["card"]
            assert "customer_email" not in kwargs2

    def test_get_or_create_customer(self):
        # Arrange
        with patch("stripe.Customer.list") as mock_list, \
             patch("stripe.Customer.create") as mock_create:

            # Existing customer
            existing_cust = MagicMock(id="cus_existing")
            mock_list.return_value.data = [existing_cust]

            # Act
            sut_existing = StripeService.get_or_create_customer("old@example.com")
            # Assert
            assert sut_existing.id == "cus_existing"
            mock_create.assert_not_called()

            # New customer
            mock_list.return_value.data = []
            new_cust = MagicMock(id="cus_new")
            mock_create.return_value = new_cust

            # Act
            sut_new = StripeService.get_or_create_customer("new@example.com", name="New User", metadata={"tier": "gold"})
            # Assert
            assert sut_new.id == "cus_new"
            mock_create.assert_called_once_with(email="new@example.com", name="New User", metadata={"tier": "gold"})

    def test_create_subscription_checkout_session(self):
        # Arrange
        with patch("stripe.checkout.Session.create") as mock_create:
            mock_create.return_value = {"id": "cs_sub_123"}

            # Act with customer_id
            sut_sub = StripeService.create_subscription_checkout_session(
                subscription_id=10,
                business_id=20,
                user_id=30,
                amount_in_cents=5000,
                currency="INR",
                plan_name="Enterprise",
                success_url="https://app/success",
                cancel_url="https://app/cancel",
                stripe_customer_id="cus_abc",
            )

            # Assert
            assert sut_sub["id"] == "cs_sub_123"
            _, kwargs = mock_create.call_args
            assert kwargs["customer"] == "cus_abc"

            # Act with email only
            StripeService.create_subscription_checkout_session(
                subscription_id=11,
                business_id=21,
                user_id=31,
                amount_in_cents=2000,
                currency="USD",
                plan_name="Starter",
                success_url="https://app/success",
                cancel_url="https://app/cancel",
                customer_email="sub@example.com",
            )
            _, kwargs2 = mock_create.call_args
            assert kwargs2["customer_email"] == "sub@example.com"

    def test_create_refund(self):
        # Arrange
        with patch("stripe.Refund.create") as mock_refund:
            mock_refund.return_value = {"id": "re_123", "status": "succeeded"}

            # Act - full refund minimal args
            sut_ref = StripeService.create_refund("ch_123")
            # Assert
            assert sut_ref["id"] == "re_123"
            mock_refund.assert_called_with(charge="ch_123")

            # Act - partial refund with all options
            StripeService.create_refund(
                charge_id="ch_456",
                amount_in_cents=1000,
                reason="requested_by_customer",
                reverse_transfer=True,
                refund_application_fee=True,
            )
            mock_refund.assert_called_with(
                charge="ch_456",
                amount=1000,
                reason="requested_by_customer",
                reverse_transfer=True,
                refund_application_fee=True,
            )
