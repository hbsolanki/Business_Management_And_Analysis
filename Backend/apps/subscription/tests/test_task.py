from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from apps.base.tests import BaseTestCase
from apps.subscription.tasks import send_subscription_email, deactivate_expired_subscriptions
from apps.subscription.models import Subscription
from apps.business.models import Branch
from apps.product.models import Product
from apps.user.models import User


class TaskTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    @patch("apps.subscription.tasks.send_email_task.delay")
    @patch("apps.subscription.tasks.generate_subscription_pdf")
    def test_send_subscription_email(self, mock_pdf, mock_email):
        """Test sending subscription activation email with PDF receipt."""
        mock_pdf.return_value = b"fake pdf content"
        self.owner_a.email = "owner@example.com"
        self.owner_a.save()
        
        send_subscription_email(
            subscription_id=self.subscription_a.id,
            user_id=self.owner_a.id
        )
        
        mock_pdf.assert_called_once_with(self.subscription_a, self.owner_a)
        mock_email.assert_called_once()
        args, kwargs = mock_email.call_args
        self.assertEqual(kwargs["to_email"], "owner@example.com")
        self.assertIn(self.subscription_a.plan_name, kwargs["subject"])
        self.assertEqual(kwargs["attachments"][0]["name"], f"BizVisionary_Receipt_{self.subscription_a.id}.pdf")

    def test_deactivate_expired_subscriptions(self):
        """Expired subscriptions deactivate extra resources and are deleted."""
        # Setup: Business A has 2 branches, 2 products, and multiple staff in setUp
        self.subscription_a.end_date = timezone.now() - timedelta(days=1)
        self.subscription_a.save()
        
        # Verify initial state
        self.assertEqual(Branch.objects.filter(business=self.business_a, is_active=True).count(), 2)
        self.assertEqual(Product.objects.filter(business=self.business_a, is_active=True).count(), 2)
        self.assertGreater(User.objects.filter(business_roles__business=self.business_a, is_active=True).count(), 1)
        
        # Execute task
        deactivate_expired_subscriptions()
        
        # Verify resources are throttled to 1 each
        self.assertEqual(Branch.objects.filter(business=self.business_a, is_active=True).count(), 1)
        self.assertEqual(Product.objects.filter(business=self.business_a, is_active=True).count(), 1)
        self.assertEqual(User.objects.filter(business_roles__business=self.business_a, is_active=True).count(), 1)
        
        # Verify subscription was deleted
        self.assertFalse(Subscription.objects.filter(id=self.subscription_a.id).exists())