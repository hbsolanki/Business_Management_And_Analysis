import pytest
from datetime import timedelta
from django.utils import timezone
from apps.base.tests import BaseTestCase
from apps.subscription.models import Subscription
from apps.payment.models import WebhookEvent as SubscriptionWebhookEvent
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService
from rest_framework.exceptions import ValidationError



@pytest.fixture
def payment_service_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()

    def _create_pending_subscription(plan, business):
        now = timezone.now()
        return Subscription.objects.create(
            business=business,
            plan=plan,
            plan_name=plan.name,
            price=plan.price,
            duration_days=plan.duration_days,
            max_products=plan.max_products,
            max_invoices=plan.max_invoices,
            max_staff=plan.max_staff,
            max_branches=plan.max_branches,
            has_advanced_analytics=plan.has_advanced_analytics,
            has_chat=plan.has_chat,
            has_api_access=plan.has_api_access,
            has_ai_agent=plan.has_ai_agent,
            start_date=now,
            end_date=now + timedelta(days=plan.duration_days or 30),
            is_active=False,
            status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
        )

    tc.create_pending_sub = _create_pending_subscription
    return tc


@pytest.mark.django_db
class TestSubscriptionPaymentService:

    def test_handle_success_is_idempotent_and_supersedes_previous_active(self, payment_service_env):
        # Arrange
        sut_new_sub = payment_service_env.create_pending_sub(payment_service_env.plan_a, payment_service_env.business_a)
        old_sub = payment_service_env.subscription_a

        metadata = {
            "subscription_id": str(sut_new_sub.id),
            "user_id": str(payment_service_env.owner_a.id),
        }

        # Act
        SubscriptionPaymentService.handle_success(
            metadata,
            "pi_subscription_1",
            event_id="evt_subscription_1",
            event_type="payment_intent.succeeded",
            payment_type="SUBSCRIPTION",
        )
        SubscriptionPaymentService.handle_success(
            metadata,
            "pi_subscription_1",
            event_id="evt_subscription_1",
            event_type="payment_intent.succeeded",
            payment_type="SUBSCRIPTION",
        )

        # Assert
        sut_new_sub.refresh_from_db()
        old_sub.refresh_from_db()

        assert sut_new_sub.is_active is True
        assert sut_new_sub.status == Subscription.SubscriptionStatus.ACTIVE

        assert old_sub.is_active is False
        assert old_sub.status == Subscription.SubscriptionStatus.SUPERSEDED

        event = SubscriptionWebhookEvent.objects.get(stripe_event_id="evt_subscription_1")
        assert event.is_processed is True
        assert SubscriptionWebhookEvent.objects.filter(stripe_event_id="evt_subscription_1").count() == 1

    def test_handle_failure_marks_pending_subscription_failed_without_delete(self, payment_service_env):
        # Arrange
        sut_pending_sub = payment_service_env.create_pending_sub(payment_service_env.plan_a, payment_service_env.business_a)

        # Act
        SubscriptionPaymentService.handle_failure(
            {"subscription_id": str(sut_pending_sub.id)},
            event_id="evt_subscription_failed",
            event_type="payment_intent.payment_failed",
            payment_type="SUBSCRIPTION",
        )

        # Assert
        sut_pending_sub.refresh_from_db()
        assert sut_pending_sub.is_active is False
        assert sut_pending_sub.status == Subscription.SubscriptionStatus.FAILED
        assert sut_pending_sub.failed_at is not None

        event = SubscriptionWebhookEvent.objects.get(stripe_event_id="evt_subscription_failed")
        assert event.is_processed is True

    def test_handle_success_rejects_business_metadata_mismatch(self, payment_service_env):
        # Arrange
        sut_pending_sub = payment_service_env.create_pending_sub(payment_service_env.plan_a, payment_service_env.business_a)

        # Act & Assert
        with pytest.raises((ValueError, ValidationError)):
            SubscriptionPaymentService.handle_success(
                {
                    "subscription_id": str(sut_pending_sub.id),
                    "business_id": "999999",
                    "user_id": str(payment_service_env.owner_a.id),
                },
                "pi_subscription_mismatch",
                event_id="evt_subscription_mismatch",
                event_type="payment_intent.succeeded",
                payment_type="SUBSCRIPTION",
            )

        sut_pending_sub.refresh_from_db()
        assert sut_pending_sub.is_active is False
        assert sut_pending_sub.status == Subscription.SubscriptionStatus.PENDING_PAYMENT

    def test_handle_success_rejects_event_id_reuse_with_different_subscription(self, payment_service_env):
        # Arrange
        first_sub = payment_service_env.create_pending_sub(payment_service_env.plan_a, payment_service_env.business_a)
        second_sub = payment_service_env.create_pending_sub(payment_service_env.plan_a, payment_service_env.business_a)

        SubscriptionPaymentService.handle_success(
            {
                "subscription_id": str(first_sub.id),
                "business_id": str(payment_service_env.business_a.id),
                "user_id": str(payment_service_env.owner_a.id),
            },
            "pi_subscription_reuse_1",
            event_id="evt_subscription_reuse",
            event_type="payment_intent.succeeded",
            payment_type="SUBSCRIPTION",
        )

        # Act & Assert - Idempotent event ID reuse should not process second subscription
        SubscriptionPaymentService.handle_success(
            {
                "subscription_id": str(second_sub.id),
                "business_id": str(payment_service_env.business_a.id),
                "user_id": str(payment_service_env.owner_a.id),
            },
            "pi_subscription_reuse_2",
            event_id="evt_subscription_reuse",
            event_type="payment_intent.succeeded",
            payment_type="SUBSCRIPTION",
        )

        second_sub.refresh_from_db()
        assert second_sub.is_active is False
        assert second_sub.status == Subscription.SubscriptionStatus.PENDING_PAYMENT

        event = SubscriptionWebhookEvent.objects.get(stripe_event_id="evt_subscription_reuse")
        assert event.is_processed is True
