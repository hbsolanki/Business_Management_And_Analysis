from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from apps.base.tests import BaseTestCase
from apps.subscription.tasks import (
    send_subscription_email,
    deactivate_expired_subscriptions,
)
from apps.subscription.models import Subscription, Plan
from apps.business.models import Branch
from apps.product.models import Product
from apps.user.models import User


class TaskTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    @patch("apps.subscription.tasks.send_email_task.delay")
    @patch("apps.subscription.tasks.generate_subscription_pdf")
    def test_send_subscription_email(self, mock_pdf, mock_email_delay):
        """Verify that a subscription email with PDF attachment is triggered."""
        # 1. Setup Data
        plan = Plan.objects.create(name="Standard Plan", price=100.0, duration_days=30)
        start_date = timezone.now()  # Using timezone-aware now

        # Deactivate existing subscriptions to avoid uniqueness violation
        Subscription.objects.filter(business=self.business_a).update(is_active=False)

        subscription = Subscription.objects.create(
            business=self.business_a,
            plan=plan,
            plan_name=plan.name,
            price=plan.price,
            duration_days=plan.duration_days,
            start_date=start_date,
            end_date=start_date + timedelta(days=30),
            is_active=True,
        )

        # Mock PDF bytes
        mock_pdf.return_value = b"test pdf content"

        # 2. Call Task
        send_subscription_email(
            subscription_id=subscription.id, user_id=self.owner_a.id
        )

        # 3. Verify
        mock_email_delay.assert_called_once()
        _, kwargs = mock_email_delay.call_args
        self.assertEqual(kwargs["to_email"], self.owner_a.email)
        self.assertIn("Subscription Activated", kwargs["subject"])
        self.assertEqual(len(kwargs["attachments"]), 1)
        self.assertEqual(
            kwargs["attachments"][0]["name"],
            f"BizVisionary_Receipt_{subscription.id}.pdf",
        )

    def test_deactivate_expired_subscriptions(self):
        """Verify surplus resources are deactivated and expired subscription purged."""
        # Add surplus resources using BaseTestCase helpers
        # We already have: 2 branches (A1, A2), 2 products (A1, A2), 2 managers + 2 employees from Base setup
        # Total from Base: 2 Branch, 2 Product, 5 Staff (1 Owner + 2 Manager + 2 Employee)

        # Let's add one more each to make it 3+
        Branch.objects.create(
            business=self.business_a, name="Branch A3", is_active=True
        )
        self.create_product(self.business_a, name="Product A3", is_active=True)
        self.create_employee(
            username="employee_a3", business=self.business_a, is_active=True
        )

        # Initial active counts (Business A): 3 branches, 3 products, 6 staff (1 Owner + 2 Manager + 3 Employee)
        self.assertEqual(
            Branch.objects.filter(business=self.business_a, is_active=True).count(), 3
        )
        self.assertEqual(
            Product.objects.filter(business=self.business_a, is_active=True).count(), 3
        )

        staff_count = User.objects.filter(
            business_roles__business=self.business_a, is_active=True
        ).count()
        self.assertEqual(staff_count, 6)

        # Deactivate existing subscription to avoid unique active subscription constraint violation
        Subscription.objects.filter(business=self.business_a).update(is_active=False)

        # Create Expired Subscription (Expired yesterday)
        plan = Plan.objects.create(name="Expired Plan", price=0, duration_days=30)
        expired_sub = Subscription.objects.create(
            business=self.business_a,
            plan=plan,
            plan_name=plan.name,
            start_date=timezone.now() - timedelta(days=40),
            end_date=timezone.now() - timedelta(days=1),
            is_active=True,
        )

        # Call Task
        deactivate_expired_subscriptions()

        # Verify Results: resources limited back to 1 (the first/default found remains)
        self.assertEqual(
            Branch.objects.filter(business=self.business_a, is_active=True).count(), 1
        )
        self.assertEqual(
            Product.objects.filter(business=self.business_a, is_active=True).count(), 1
        )
        self.assertEqual(
            User.objects.filter(
                business_roles__business=self.business_a, is_active=True
            ).count(),
            2,
        )

        # Expired subscription should be retained and marked expired
        expired_sub.refresh_from_db()
        self.assertFalse(expired_sub.is_active)
        self.assertEqual(expired_sub.status, Subscription.SubscriptionStatus.EXPIRED)
        self.assertIsNotNone(expired_sub.expired_at)

    def test_deactivate_expired_subscriptions_with_queued_rollover(self):
        """Verify that an expired subscription rolls over to a queued paid subscription instead of free tier."""
        # Deactivate existing subscription to avoid unique active subscription constraint violation
        Subscription.objects.filter(business=self.business_a).update(is_active=False)

        # Create Expired Subscription (Expired yesterday)
        plan1 = Plan.objects.create(name="Expired Plan", price=50.0, duration_days=30)
        expired_sub = Subscription.objects.create(
            business=self.business_a,
            plan=plan1,
            plan_name=plan1.name,
            price=plan1.price,
            duration_days=plan1.duration_days,
            start_date=timezone.now() - timedelta(days=40),
            end_date=timezone.now() - timedelta(days=1),
            is_active=True,
        )

        # Create Queued Paid Subscription (Starts today, valid for 30 days)
        plan2 = Plan.objects.create(
            name="Queued Paid Plan",
            price=100.0,
            duration_days=30,
            max_branches=5,
            max_products=10,
            max_staff=5,
        )
        queued_sub = Subscription.objects.create(
            business=self.business_a,
            plan=plan2,
            plan_name=plan2.name,
            price=plan2.price,
            duration_days=plan2.duration_days,
            max_branches=plan2.max_branches,
            max_products=plan2.max_products,
            max_staff=plan2.max_staff,
            start_date=expired_sub.end_date,
            end_date=expired_sub.end_date + timedelta(days=30),
            is_active=False,
            status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
            payment_mode="ONLINE",
        )

        # Call Task
        deactivate_expired_subscriptions()

        # Verify rollover success
        expired_sub.refresh_from_db()
        queued_sub.refresh_from_db()

        self.assertFalse(expired_sub.is_active)
        self.assertEqual(expired_sub.status, Subscription.SubscriptionStatus.SUPERSEDED)

        self.assertTrue(queued_sub.is_active)
        self.assertEqual(queued_sub.status, Subscription.SubscriptionStatus.ACTIVE)

        # Verify that resource limits were not trimmed down to free tier (which is 1) because the new plan is active
        # The new plan limits allow 5 branches, 10 products, 5 staff.
        # Business A starts with: 2 branches, 2 products, 5 staff. All should remain active!
        self.assertEqual(
            Branch.objects.filter(business=self.business_a, is_active=True).count(), 2
        )
        self.assertEqual(
            Product.objects.filter(business=self.business_a, is_active=True).count(), 2
        )
        self.assertEqual(
            User.objects.filter(
                business_roles__business=self.business_a, is_active=True
            ).count(),
            5,
        )
