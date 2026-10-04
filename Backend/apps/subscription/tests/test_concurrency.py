import threading
from datetime import timedelta
from django.utils import timezone
from django.db import connection
from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import Group

from apps.subscription.models import Subscription, SubscriptionWebhookEvent, Plan
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService
from apps.user.models import User
from apps.business.models import Business, Branch
from apps.employee.models import UserRole, UserBusinessRole
from apps.employee.utils.permission_utils import sync_user_role_permissions
from apps.employee.permission.role_permissions import ROLE_PERMISSIONS


class SubscriptionConcurrencyTestCase(APITransactionTestCase):
    def setUp(self):
        super().setUp()
        # Clean database
        Subscription.objects.all().delete()
        SubscriptionWebhookEvent.objects.all().delete()
        Branch.objects.all().delete()
        User.objects.all().delete()
        Business.objects.all().delete()

        # Set up groups/permissions
        for role_name in ROLE_PERMISSIONS.keys():
            Group.objects.get_or_create(name=role_name)

        # Create business
        self.business = Business.objects.create(name="Concurrency Biz", is_active=True)

        # Create Owner user
        self.owner = User.objects.create_user(
            username="concurrency_owner",
            password="Password123!",
            mobile_number="9990001112",
            first_name="Concurrency",
            email="owner_concurrency@example.com",
        )
        UserBusinessRole.objects.create(
            user=self.owner, business=self.business, role=UserRole.OWNER
        )
        sync_user_role_permissions(self.owner)

        # Plan
        self.plan = Plan.objects.create(
            name="Plan Limit 1",
            price=0.0,
            duration_days=30,
            max_products=10,
            max_staff=10,
            max_invoices=10,
            max_branches=1,  # Strict limit: only 1 branch allowed
            is_active=True,
        )

    def test_concurrent_webhook_idempotency(self):
        """Simulate two concurrent threads attempting to process the same webhook event.
        One must succeed, and the other must serialize and recognize it's already processed,
        without creating duplicate subscriptions or webhook events.
        """
        # Create pending subscription
        now = timezone.now()
        sub = Subscription.objects.create(
            business=self.business,
            plan=self.plan,
            plan_name=self.plan.name,
            price=self.plan.price,
            duration_days=self.plan.duration_days,
            start_date=now,
            end_date=now + timedelta(days=30),
            is_active=False,
            status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
        )

        metadata = {
            "subscription_id": str(sub.id),
            "user_id": str(self.owner.id),
        }

        errors = []

        def run_webhook():
            # Close old connections so that Django opens a fresh one for this thread
            connection.close()
            try:
                SubscriptionPaymentService.handle_success(
                    metadata,
                    "pi_concurrency_test",
                    event_id="evt_concurrency_123",
                    event_type="payment_intent.succeeded",
                    payment_type="SUBSCRIPTION",
                )
            except Exception as e:
                errors.append(e)

        # Launch two threads concurrently
        t1 = threading.Thread(target=run_webhook)
        t2 = threading.Thread(target=run_webhook)

        t1.start()
        t2.start()

        t1.join()
        t2.join()

        # Refresh
        sub.refresh_from_db()
        events = SubscriptionWebhookEvent.objects.filter(
            stripe_event_id="evt_concurrency_123"
        )

        # Assertions
        # 1. Exactly one event is created in the database
        self.assertEqual(events.count(), 1)
        # 2. The event is marked as processed
        self.assertTrue(events.first().is_processed)
        # 3. The subscription is now active
        self.assertTrue(sub.is_active)
        self.assertEqual(sub.status, Subscription.SubscriptionStatus.ACTIVE)

    def test_concurrent_limit_enforcement_prevents_bypass(self):
        """Simulate concurrent branch creation requests.
        Since the plan has max_branches=1, and 0 exist currently,
        only one request should succeed; the other must return a 403.
        """
        # Active subscription
        now = timezone.now()
        Subscription.objects.create(
            business=self.business,
            plan=self.plan,
            plan_name=self.plan.name,
            price=self.plan.price,
            duration_days=self.plan.duration_days,
            max_branches=self.plan.max_branches,
            max_products=self.plan.max_products,
            max_staff=self.plan.max_staff,
            max_invoices=self.plan.max_invoices,
            start_date=now,
            end_date=now + timedelta(days=30),
            is_active=True,
            status=Subscription.SubscriptionStatus.ACTIVE,
        )

        # We will make the requests directly through the endpoint or a helper
        url = reverse("branch-list")

        status_codes = []

        def create_branch():
            # Close old connections so that Django opens a fresh one for this thread
            connection.close()
            from rest_framework.test import APIClient

            client = APIClient()
            client.force_authenticate(user=self.owner)
            try:
                response = client.post(url, {"name": "Thread Branch"}, format="json")
                status_codes.append(response.status_code)
            except Exception:
                status_codes.append(500)

        # Launch two threads concurrently
        t1 = threading.Thread(target=create_branch)
        t2 = threading.Thread(target=create_branch)

        t1.start()
        t2.start()

        t1.join()
        t2.join()

        # Check outcomes:
        # Total branches in DB for this business should be exactly 1
        branch_count = Branch.objects.filter(business=self.business).count()
        self.assertEqual(branch_count, 1)

        # One request should have succeeded (201 Created), the other failed with 403 Forbidden
        self.assertIn(status.HTTP_201_CREATED, status_codes)
        self.assertIn(status.HTTP_403_FORBIDDEN, status_codes)

    def tearDown(self):
        from django.db import connections

        for conn in connections.all():
            conn.close()
        super().tearDown()
