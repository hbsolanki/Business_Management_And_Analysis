import pytest
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from apps.base.tests import BaseTestCase
from apps.subscription.tasks import (
    send_subscription_email,
    deactivate_expired_subscriptions,
)
from apps.subscription.models import Subscription
from apps.business.models import Branch
from apps.product.models import Product
from apps.user.models import User


@pytest.fixture
def sub_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestSubscriptionTask:

    @patch("apps.subscription.tasks.send_email_task.delay")
    @patch("apps.subscription.tasks.generate_subscription_pdf")
    def test_send_subscription_email(self, mock_pdf, mock_email, sub_env):
        # Arrange
        mock_pdf.return_value = b"fake pdf content"
        sub_env.owner_a.email = "owner@example.com"
        sub_env.owner_a.save()

        # Act
        send_subscription_email(
            subscription_id=sub_env.subscription_a.id, user_id=sub_env.owner_a.id
        )

        # Assert
        mock_pdf.assert_called_once_with(sub_env.subscription_a, sub_env.owner_a)
        mock_email.assert_called_once()
        _, kwargs = mock_email.call_args
        assert kwargs["to_email"] == "owner@example.com"
        assert sub_env.subscription_a.plan_name in kwargs["subject"]
        assert kwargs["attachments"][0]["name"] == f"BizVisionary_Receipt_{sub_env.subscription_a.id}.pdf"

    def test_deactivate_expired_subscriptions(self, sub_env):
        # Arrange
        sub_env.subscription_a.end_date = timezone.now() - timedelta(days=1)
        sub_env.subscription_a.save()

        assert Branch.objects.filter(business=sub_env.business_a, is_active=True).count() == 2
        assert Product.objects.filter(business=sub_env.business_a, is_active=True).count() == 2
        assert User.objects.filter(business_roles__business=sub_env.business_a, is_active=True).count() > 1

        # Act
        deactivate_expired_subscriptions()

        # Assert
        assert Branch.objects.filter(business=sub_env.business_a, is_active=True).count() == 1
        assert Product.objects.filter(business=sub_env.business_a, is_active=True).count() == 1
        assert User.objects.filter(business_roles__business=sub_env.business_a, is_active=True).count() == 2

        sub_env.subscription_a.refresh_from_db()
        assert sub_env.subscription_a.is_active is False
        assert sub_env.subscription_a.status == Subscription.SubscriptionStatus.EXPIRED
        assert sub_env.subscription_a.expired_at is not None
