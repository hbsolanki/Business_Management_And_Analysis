import pytest
import threading
from datetime import timedelta
from django.utils import timezone
from django.db import connection, connections
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth.models import Group

from apps.subscription.models import Subscription, Plan
from apps.payment.models import WebhookEvent as SubscriptionWebhookEvent
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService
from apps.user.models import User
from apps.business.models import Business, Branch
from apps.employee.models import UserRole, UserBusinessRole
from apps.employee.utils.permission_utils import sync_user_role_permissions
from apps.employee.permission.role_permissions import ROLE_PERMISSIONS


@pytest.fixture
def concurrency_env():
    Subscription.objects.all().delete()
    SubscriptionWebhookEvent.objects.all().delete()
    Branch.objects.all().delete()
    User.objects.all().delete()
    Business.objects.all().delete()

    for role_name in ROLE_PERMISSIONS.keys():
        Group.objects.get_or_create(name=role_name)

    business = Business.objects.create(name="Concurrency Biz", is_active=True)

    owner = User.objects.create_user(
        username="concurrency_owner",
        password="Password123!",
        mobile_number="9990001112",
        first_name="Concurrency",
        email="owner_concurrency@example.com",
    )
    UserBusinessRole.objects.create(
        user=owner, business=business, role=UserRole.OWNER
    )
    sync_user_role_permissions(owner)

    plan = Plan.objects.create(
        name="Plan Limit 1",
        price=100.0,
        duration_days=30,
        max_products=10,
        max_staff=10,
        max_invoices=10,
        max_branches=1,
        is_active=True,
    )

    class ConcurrencyEnv:
        pass

    env = ConcurrencyEnv()
    env.business = business
    env.owner = owner
    env.plan = plan
    return env


@pytest.mark.django_db(transaction=True)
class TestSubscriptionConcurrency:

    def test_concurrent_webhook_idempotency(self, concurrency_env):
        # Arrange
        now = timezone.now()
        sut_sub = Subscription.objects.create(
            business=concurrency_env.business,
            plan=concurrency_env.plan,
            plan_name=concurrency_env.plan.name,
            price=concurrency_env.plan.price,
            duration_days=concurrency_env.plan.duration_days,
            start_date=now,
            end_date=now + timedelta(days=30),
            is_active=False,
            status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
        )

        metadata = {
            "subscription_id": str(sut_sub.id),
            "user_id": str(concurrency_env.owner.id),
        }

        errors = []

        def run_webhook():
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

        # Act
        t1 = threading.Thread(target=run_webhook)
        t2 = threading.Thread(target=run_webhook)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Assert
        sut_sub.refresh_from_db()
        events = SubscriptionWebhookEvent.objects.filter(stripe_event_id="evt_concurrency_123")
        assert events.count() == 1
        assert events.first().is_processed is True
        assert sut_sub.is_active is True
        assert sut_sub.status == Subscription.SubscriptionStatus.ACTIVE

    def test_concurrent_limit_enforcement_prevents_bypass(self, concurrency_env):
        # Arrange
        now = timezone.now()
        Subscription.objects.create(
            business=concurrency_env.business,
            plan=concurrency_env.plan,
            plan_name=concurrency_env.plan.name,
            price=concurrency_env.plan.price,
            duration_days=concurrency_env.plan.duration_days,
            max_branches=concurrency_env.plan.max_branches,
            max_products=concurrency_env.plan.max_products,
            max_staff=concurrency_env.plan.max_staff,
            max_invoices=concurrency_env.plan.max_invoices,
            start_date=now,
            end_date=now + timedelta(days=30),
            is_active=True,
            status=Subscription.SubscriptionStatus.ACTIVE,
        )

        sut_url = reverse("branch-list")
        status_codes = []

        def create_branch():
            connection.close()
            client = APIClient()
            client.force_authenticate(user=concurrency_env.owner)
            try:
                response = client.post(sut_url, {"name": "Thread Branch"}, format="json")
                status_codes.append(response.status_code)
            except Exception:
                status_codes.append(500)

        # Act
        t1 = threading.Thread(target=create_branch)
        t2 = threading.Thread(target=create_branch)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Assert
        branch_count = Branch.objects.filter(business=concurrency_env.business).count()
        assert branch_count == 1
        assert status.HTTP_201_CREATED in status_codes
        assert status.HTTP_403_FORBIDDEN in status_codes
