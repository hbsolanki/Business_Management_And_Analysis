from datetime import timedelta

from django.utils import timezone

from apps.base.tests import BaseTestCase
from apps.subscription.models import Subscription, SubscriptionWebhookEvent
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService


class SubscriptionPaymentServiceTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def _create_pending_subscription(self, plan, business):
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

    def test_handle_success_is_idempotent_and_supersedes_previous_active(self):
        new_sub = self._create_pending_subscription(self.plan_a, self.business_a)
        old_sub = self.subscription_a

        metadata = {
            "subscription_id": str(new_sub.id),
            "user_id": str(self.owner_a.id),
        }

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

        new_sub.refresh_from_db()
        old_sub.refresh_from_db()

        self.assertTrue(new_sub.is_active)
        self.assertEqual(new_sub.status, Subscription.SubscriptionStatus.ACTIVE)
        self.assertEqual(new_sub.payment_reference, "pi_subscription_1")

        self.assertFalse(old_sub.is_active)
        self.assertEqual(old_sub.status, Subscription.SubscriptionStatus.SUPERSEDED)

        event = SubscriptionWebhookEvent.objects.get(
            stripe_event_id="evt_subscription_1"
        )
        self.assertTrue(event.is_processed)
        self.assertEqual(
            SubscriptionWebhookEvent.objects.filter(
                stripe_event_id="evt_subscription_1"
            ).count(),
            1,
        )

    def test_handle_failure_marks_pending_subscription_failed_without_delete(self):
        pending_sub = self._create_pending_subscription(self.plan_a, self.business_a)

        SubscriptionPaymentService.handle_failure(
            {"subscription_id": str(pending_sub.id)},
            event_id="evt_subscription_failed",
            event_type="payment_intent.payment_failed",
            payment_type="SUBSCRIPTION",
        )

        pending_sub.refresh_from_db()
        self.assertFalse(pending_sub.is_active)
        self.assertEqual(pending_sub.status, Subscription.SubscriptionStatus.FAILED)
        self.assertIsNotNone(pending_sub.failed_at)

        event = SubscriptionWebhookEvent.objects.get(
            stripe_event_id="evt_subscription_failed"
        )
        self.assertTrue(event.is_processed)

    def test_handle_success_rejects_business_metadata_mismatch(self):
        pending_sub = self._create_pending_subscription(self.plan_a, self.business_a)

        with self.assertRaises(ValueError):
            SubscriptionPaymentService.handle_success(
                {
                    "subscription_id": str(pending_sub.id),
                    "business_id": "999999",
                    "user_id": str(self.owner_a.id),
                },
                "pi_subscription_mismatch",
                event_id="evt_subscription_mismatch",
                event_type="payment_intent.succeeded",
                payment_type="SUBSCRIPTION",
            )

        pending_sub.refresh_from_db()
        self.assertFalse(pending_sub.is_active)
        self.assertEqual(
            pending_sub.status, Subscription.SubscriptionStatus.PENDING_PAYMENT
        )

        event = SubscriptionWebhookEvent.objects.get(
            stripe_event_id="evt_subscription_mismatch"
        )
        self.assertFalse(event.is_processed)
        self.assertIn("Metadata business does not match", event.error_message)

    def test_handle_success_rejects_event_id_reuse_with_different_subscription(self):
        first_sub = self._create_pending_subscription(self.plan_a, self.business_a)
        second_sub = self._create_pending_subscription(self.plan_a, self.business_a)

        SubscriptionPaymentService.handle_success(
            {
                "subscription_id": str(first_sub.id),
                "business_id": str(self.business_a.id),
                "user_id": str(self.owner_a.id),
            },
            "pi_subscription_reuse_1",
            event_id="evt_subscription_reuse",
            event_type="payment_intent.succeeded",
            payment_type="SUBSCRIPTION",
        )

        with self.assertRaises(ValueError):
            SubscriptionPaymentService.handle_success(
                {
                    "subscription_id": str(second_sub.id),
                    "business_id": str(self.business_a.id),
                    "user_id": str(self.owner_a.id),
                },
                "pi_subscription_reuse_2",
                event_id="evt_subscription_reuse",
                event_type="payment_intent.succeeded",
                payment_type="SUBSCRIPTION",
            )

        second_sub.refresh_from_db()
        self.assertFalse(second_sub.is_active)
        self.assertEqual(
            second_sub.status, Subscription.SubscriptionStatus.PENDING_PAYMENT
        )

        event = SubscriptionWebhookEvent.objects.get(
            stripe_event_id="evt_subscription_reuse"
        )
        self.assertTrue(event.is_processed)
