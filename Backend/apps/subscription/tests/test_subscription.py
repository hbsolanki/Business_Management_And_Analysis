from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.subscription.models import Plan, Subscription


class SubscriptionTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.url_plans = reverse("subscription_plan-plans-details")
        self.url_purchase = reverse("subscription_plan-plan-purchase")
        self.url_purchased = reverse("subscription_plan-purchased-plan")
        # pk will be added later

    def test_plans_details(self):
        """Plans details accessible with and without authentication."""
        # 1. Unauthenticated
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url_plans)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

        # 2. Authenticated
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.url_plans)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_plan_purchase(self):
        """Purchase valid plan and verify all fields."""
        Subscription.objects.all().delete()  # Start clean for deterministic limits
        self.client.force_authenticate(user=self.owner_a)
        plan = Plan.objects.first()
        plan.price = 0.0
        plan.save()
        data = {"plan_id": plan.id}
        response = self.client.post(self.url_purchase, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify success response fields
        self.assertIn("subscription_id", response.data)
        self.assertEqual(response.data["plan"], plan.name)

        # 1. Verify subscription details via purchased_plan
        response = self.client.get(self.url_purchased)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check specific fields of SubscriptionSerializer
        self.assertEqual(response.data["plan_name"], plan.name)
        self.assertEqual(float(response.data["price"]), float(plan.price))
        self.assertEqual(response.data["duration_days"], plan.duration_days)
        self.assertEqual(response.data["max_products"], plan.max_products)
        self.assertEqual(response.data["max_staff"], plan.max_staff)
        self.assertIn("status", response.data)
        self.assertIn("remaining_days", response.data)

        # 2. Invalid plan ID
        response = self.client.post(self.url_purchase, {"plan_id": 9999}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan_id", response.data)

        # 3. Empty plan ID
        response = self.client.post(self.url_purchase, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Cumulative Logic (Upgrade)
        # Initial purchase has N products. Second purchase should add another M.
        Subscription.objects.all().delete()  # Clean state again

        # Second buy
        self.client.post(self.url_purchase, {"plan_id": plan.id}, format="json")
        # Third buy (cumulative check)
        self.client.post(self.url_purchase, {"plan_id": plan.id}, format="json")

        response = self.client.get(self.url_purchased)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Cumulative: plan.max_products * 2
        self.assertEqual(response.data["max_products"], plan.max_products * 2)
        self.assertEqual(response.data["max_staff"], plan.max_staff * 2)
        self.assertEqual(response.data["max_invoices"], plan.max_invoices * 2)

    def test_purchased_plan(self):
        """Verify purchased_plan endpoint handles cached lookups and empty cases."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. No active subscription
        Subscription.objects.all().delete()
        response = self.client.get(self.url_purchased)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "You not purchased any plan")

        # 2. With active subscription
        plan = Plan.objects.first()
        plan.price = 0.0
        plan.save()
        self.client.post(self.url_purchase, {"plan_id": plan.id}, format="json")

        response = self.client.get(self.url_purchased)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plan_name"], plan.name)

    def test_plan_transition_upgrade_and_downgrade(self):
        """Verify plan transitions: upgrades take effect immediately, downgrades are queued."""
        from apps.subscription.services.payment_service import (
            SubscriptionPaymentService,
        )
        from uuid import uuid4

        self.client.force_authenticate(user=self.owner_a)
        Subscription.objects.all().delete()

        # Cheaper Plan: price = 100.0, expensive Plan: price = 500.0
        plan_cheap = Plan.objects.get(name="Plan A")
        plan_cheap.price = 100.0
        plan_cheap.save()

        plan_expensive = Plan.objects.get(name="Plan B")
        plan_expensive.price = 500.0
        plan_expensive.save()

        # 1. Purchase Cheaper Plan (creates pending payment subscription)
        res = self.client.post(
            self.url_purchase, {"plan_id": plan_cheap.id}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sub_cheap_id = res.data["subscription_id"]

        sub_cheap = Subscription.objects.get(id=sub_cheap_id)
        self.assertFalse(sub_cheap.is_active)
        self.assertEqual(
            sub_cheap.status, Subscription.SubscriptionStatus.PENDING_PAYMENT
        )

        # Simulate online payment success for cheap plan
        tx_id_cheap = str(uuid4())
        SubscriptionPaymentService.handle_success(
            metadata={
                "subscription_id": sub_cheap.id,
                "business_id": self.business_a.id,
                "user_id": self.owner_a.id,
            },
            transaction_id=tx_id_cheap,
            event_id=f"evt_{tx_id_cheap}",
        )
        sub_cheap.refresh_from_db()
        self.assertTrue(sub_cheap.is_active)
        self.assertEqual(sub_cheap.status, Subscription.SubscriptionStatus.ACTIVE)

        # 2. Upgrade Transition: Purchase Expensive Plan (immediate upgrade, supersedes cheap plan)
        res_up = self.client.post(
            self.url_purchase, {"plan_id": plan_expensive.id}, format="json"
        )
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        sub_up_id = res_up.data["subscription_id"]

        # Cheap plan should be superseded immediately in the serializer/creation block
        sub_cheap.refresh_from_db()
        self.assertFalse(sub_cheap.is_active)
        self.assertEqual(sub_cheap.status, Subscription.SubscriptionStatus.SUPERSEDED)

        sub_up = Subscription.objects.get(id=sub_up_id)
        self.assertFalse(sub_up.is_active)
        self.assertEqual(sub_up.status, Subscription.SubscriptionStatus.PENDING_PAYMENT)

        # Simulate online payment success for expensive upgraded plan
        tx_id_up = str(uuid4())
        SubscriptionPaymentService.handle_success(
            metadata={
                "subscription_id": sub_up.id,
                "business_id": self.business_a.id,
                "user_id": self.owner_a.id,
            },
            transaction_id=tx_id_up,
            event_id=f"evt_{tx_id_up}",
        )
        sub_up.refresh_from_db()
        self.assertTrue(sub_up.is_active)
        self.assertEqual(sub_up.status, Subscription.SubscriptionStatus.ACTIVE)

        # 3. Downgrade Transition: Purchase Cheaper Plan (queued downgrade)
        res_down = self.client.post(
            self.url_purchase, {"plan_id": plan_cheap.id}, format="json"
        )
        self.assertEqual(res_down.status_code, status.HTTP_200_OK)
        sub_down_id = res_down.data["subscription_id"]

        # Upgraded expensive plan must remain active during downgrade queueing!
        sub_up.refresh_from_db()
        self.assertTrue(sub_up.is_active)
        self.assertEqual(sub_up.status, Subscription.SubscriptionStatus.ACTIVE)

        sub_down = Subscription.objects.get(id=sub_down_id)
        self.assertFalse(sub_down.is_active)
        self.assertEqual(
            sub_down.status, Subscription.SubscriptionStatus.PENDING_PAYMENT
        )
        self.assertEqual(
            sub_down.start_date, sub_up.end_date
        )  # Start date is set to end of active plan

        # Simulate online payment success for queued cheap plan
        tx_id_down = str(uuid4())
        SubscriptionPaymentService.handle_success(
            metadata={
                "subscription_id": sub_down.id,
                "business_id": self.business_a.id,
                "user_id": self.owner_a.id,
            },
            transaction_id=tx_id_down,
            event_id=f"evt_{tx_id_down}",
        )
        sub_down.refresh_from_db()
        # Should still be inactive and pending (but payment_mode = ONLINE is stored)
        self.assertFalse(sub_down.is_active)
        self.assertEqual(sub_down.payment_mode, "ONLINE")

    def test_plan_usage(self):
        """Owner can view plan usage stats and verify increments via API."""
        self.client.force_authenticate(user=self.owner_a)

        # Ensure fresh subscription
        Subscription.objects.all().delete()
        plan = Plan.objects.first()
        plan.price = 0.0
        plan.save()
        res = self.client.post(self.url_purchase, {"plan_id": plan.id}, format="json")
        sub_id = res.data["subscription_id"]

        url_usage = reverse("subscription_plan-plan-usage", args=[sub_id])

        # 1. Initial usage
        response = self.client.get(url_usage)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        initial_products = response.data["product_created"]

        # 2. Create a product via API to trigger Usage update
        url_product_create = reverse("product-list")  # Or similar
        product_data = {
            "name": "Test Usage Product API",
            "sku": "TU-API-001",
            "base_price": 10.0,
            "cost_price": 5.0,
            "input_gst_rate": 18.0,
            "output_gst_rate": 18.0,
        }
        res_p = self.client.post(url_product_create, product_data, format="json")
        self.assertEqual(res_p.status_code, status.HTTP_201_CREATED)

        # 3. Verify increment
        response = self.client.get(url_usage)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["product_created"], initial_products + 1)

    def test_purchased_plan_with_nested_pending_subscription(self):
        """Verify that purchased_plan endpoint returns active plan as primary
        with an unpaid queued (downgrade) plan nested under pending_subscription."""
        from django.utils import timezone
        from datetime import timedelta

        self.client.force_authenticate(user=self.owner_a)
        Subscription.objects.all().delete()

        # Expensive plan is currently active
        plan_expensive = Plan.objects.get(name="Plan B")
        plan_expensive.price = 500.0
        plan_expensive.save()

        # Cheap plan will be queued as a downgrade (pending payment)
        plan_cheap = Plan.objects.get(name="Plan A")
        plan_cheap.price = 100.0
        plan_cheap.save()

        # 1. Create an active subscription for the expensive plan
        active_sub = Subscription.objects.create(
            business=self.business_a,
            plan=plan_expensive,
            plan_name=plan_expensive.name,
            price=plan_expensive.price,
            duration_days=plan_expensive.duration_days,
            max_products=plan_expensive.max_products,
            max_invoices=plan_expensive.max_invoices,
            max_staff=plan_expensive.max_staff,
            max_branches=plan_expensive.max_branches,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=plan_expensive.duration_days),
            is_active=True,
            status=Subscription.SubscriptionStatus.ACTIVE,
            payment_mode="ONLINE",
            payment_date=timezone.now(),
        )

        # 2. Queue a cheap downgrade subscription (unpaid, starts after active ends)
        pending_sub = Subscription.objects.create(
            business=self.business_a,
            plan=plan_cheap,
            plan_name=plan_cheap.name,
            price=plan_cheap.price,
            duration_days=plan_cheap.duration_days,
            max_products=plan_cheap.max_products,
            max_invoices=plan_cheap.max_invoices,
            max_staff=plan_cheap.max_staff,
            max_branches=plan_cheap.max_branches,
            start_date=active_sub.end_date,
            end_date=active_sub.end_date + timedelta(days=plan_cheap.duration_days),
            is_active=False,
            status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
            payment_mode=None,
        )

        # Verify: active subscription is primary, unpaid pending is nested
        response = self.client.get(self.url_purchased)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], active_sub.id)
        self.assertTrue(response.data["is_active"])

        self.assertIn("pending_subscription", response.data)
        nested = response.data["pending_subscription"]
        self.assertEqual(nested["id"], pending_sub.id)
        self.assertEqual(nested["plan_name"], plan_cheap.name)
        self.assertFalse(nested["is_active"])
        self.assertEqual(nested["status"], "pending_payment")
