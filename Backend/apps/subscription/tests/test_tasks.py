import pytest
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


@pytest.fixture
def sub_tasks_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestSubscriptionTasks:

    @patch("apps.subscription.tasks.send_email_task.delay")
    @patch("apps.subscription.tasks.generate_subscription_pdf")
    def test_send_subscription_email(self, mock_pdf, mock_email_delay, sub_tasks_env):
        # Arrange
        plan = Plan.objects.create(name="Standard Plan", price=100.0, duration_days=30)
        start_date = timezone.now()

        Subscription.objects.filter(business=sub_tasks_env.business_a).update(is_active=False)

        subscription = Subscription.objects.create(
            business=sub_tasks_env.business_a,
            plan=plan,
            plan_name=plan.name,
            price=plan.price,
            duration_days=plan.duration_days,
            start_date=start_date,
            end_date=start_date + timedelta(days=30),
            is_active=True,
        )

        mock_pdf.return_value = b"test pdf content"

        # Act
        send_subscription_email(
            subscription_id=subscription.id, user_id=sub_tasks_env.owner_a.id
        )

        # Assert
        mock_email_delay.assert_called_once()
        _, kwargs = mock_email_delay.call_args
        assert kwargs["to_email"] == sub_tasks_env.owner_a.email
        assert "Subscription Activated" in kwargs["subject"]
        assert len(kwargs["attachments"]) == 1
        assert kwargs["attachments"][0]["name"] == f"BizVisionary_Receipt_{subscription.id}.pdf"

    def test_deactivate_expired_subscriptions(self, sub_tasks_env):
        # Arrange
        Branch.objects.create(business=sub_tasks_env.business_a, name="Branch A3", is_active=True)
        sub_tasks_env.create_product(sub_tasks_env.business_a, name="Product A3", is_active=True)
        sub_tasks_env.create_employee(username="employee_a3", business=sub_tasks_env.business_a, is_active=True)

        assert Branch.objects.filter(business=sub_tasks_env.business_a, is_active=True).count() == 3
        assert Product.objects.filter(business=sub_tasks_env.business_a, is_active=True).count() == 3
        assert User.objects.filter(business_roles__business=sub_tasks_env.business_a, is_active=True).count() == 6

        Subscription.objects.filter(business=sub_tasks_env.business_a).update(is_active=False)

        plan = Plan.objects.create(name="Expired Plan", price=0, duration_days=30)
        expired_sub = Subscription.objects.create(
            business=sub_tasks_env.business_a,
            plan=plan,
            plan_name=plan.name,
            start_date=timezone.now() - timedelta(days=40),
            end_date=timezone.now() - timedelta(days=1),
            is_active=True,
        )

        # Act
        deactivate_expired_subscriptions()

        # Assert
        assert Branch.objects.filter(business=sub_tasks_env.business_a, is_active=True).count() == 1
        assert Product.objects.filter(business=sub_tasks_env.business_a, is_active=True).count() == 1
        assert User.objects.filter(business_roles__business=sub_tasks_env.business_a, is_active=True).count() == 2

        expired_sub.refresh_from_db()
        assert expired_sub.is_active is False
        assert expired_sub.status == Subscription.SubscriptionStatus.EXPIRED
        assert expired_sub.expired_at is not None

    def test_deactivate_expired_subscriptions_with_queued_rollover(self, sub_tasks_env):
        # Arrange
        Subscription.objects.filter(business=sub_tasks_env.business_a).update(is_active=False)

        plan1 = Plan.objects.create(name="Expired Plan", price=50.0, duration_days=30)
        expired_sub = Subscription.objects.create(
            business=sub_tasks_env.business_a,
            plan=plan1,
            plan_name=plan1.name,
            price=plan1.price,
            duration_days=plan1.duration_days,
            start_date=timezone.now() - timedelta(days=40),
            end_date=timezone.now() - timedelta(days=1),
            is_active=True,
        )

        plan2 = Plan.objects.create(
            name="Queued Paid Plan",
            price=100.0,
            duration_days=30,
            max_branches=5,
            max_products=10,
            max_staff=5,
        )
        queued_sub = Subscription.objects.create(
            business=sub_tasks_env.business_a,
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
            status=Subscription.SubscriptionStatus.ACTIVE,
        )

        # Act
        deactivate_expired_subscriptions()

        # Assert
        expired_sub.refresh_from_db()
        queued_sub.refresh_from_db()

        assert expired_sub.is_active is False
        assert expired_sub.status == Subscription.SubscriptionStatus.SUPERSEDED

        assert queued_sub.is_active is True
        assert queued_sub.status == Subscription.SubscriptionStatus.ACTIVE

        assert Branch.objects.filter(business=sub_tasks_env.business_a, is_active=True).count() == 2
        assert Product.objects.filter(business=sub_tasks_env.business_a, is_active=True).count() == 2
        assert User.objects.filter(business_roles__business=sub_tasks_env.business_a, is_active=True).count() == 5
