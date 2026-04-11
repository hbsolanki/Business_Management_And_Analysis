from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta
from apps.base.tests import BaseTestCase
from apps.subscription.tasks import send_subscription_email, deactivate_expired_subscriptions
from apps.subscription.models import Subscription, Plan
from apps.business.models import Branch
from apps.product.models import Product
from apps.user.models import User

class TaskTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    @patch('apps.subscription.tasks.send_email_task.delay')
    @patch('apps.subscription.tasks.generate_subscription_pdf')
    def test_send_subscription_email(self, mock_pdf, mock_email_delay):
        """Verify that a subscription email with PDF attachment is triggered."""
        # 1. Setup Data
        plan = Plan.objects.create(name="Standard Plan", price=100.0, duration_days=30)
        start_date = timezone.now() # Using timezone-aware now
        
        subscription = Subscription.objects.create(
            business=self.business_a,
            plan=plan,
            plan_name=plan.name,
            price=plan.price,
            duration_days=plan.duration_days,
            start_date=start_date,
            end_date=start_date + timedelta(days=30),
            is_active=True
        )
        
        # Mock PDF bytes
        mock_pdf.return_value = b"test pdf content"
        
        # 2. Call Task
        send_subscription_email(subscription_id=subscription.id, user_id=self.owner_a.id)
        
        # 3. Verify
        mock_email_delay.assert_called_once()
        args, kwargs = mock_email_delay.call_args
        self.assertEqual(kwargs['to_email'], self.owner_a.email)
        self.assertIn("Subscription Activated", kwargs['subject'])
        self.assertEqual(len(kwargs['attachments']), 1)
        self.assertEqual(kwargs['attachments'][0]['name'], f"BizVisionary_Receipt_{subscription.id}.pdf")

    def test_deactivate_expired_subscriptions(self):
        """Verify surplus resources are deactivated and expired subscription purged."""
        # Add surplus resources using BaseTestCase helpers
        # We already have: 2 branches (A1, A2), 2 products (A1, A2), 2 managers + 2 employees from Base setup
        # Total from Base: 2 Branch, 2 Product, 5 Staff (1 Owner + 2 Manager + 2 Employee)
        
        # Let's add one more each to make it 3+
        Branch.objects.create(business=self.business_a, name="Branch A3", is_active=True)
        self.create_product(self.business_a, name="Product A3", is_active=True)
        self.create_employee(username="employee_a3", business=self.business_a, is_active=True)
        
        # Initial active counts (Business A): 3 branches, 3 products, 6 staff (1 Owner + 2 Manager + 3 Employee)
        self.assertEqual(Branch.objects.filter(business=self.business_a, is_active=True).count(), 3)
        self.assertEqual(Product.objects.filter(business=self.business_a, is_active=True).count(), 3)
        
        staff_count = User.objects.filter(business_roles__business=self.business_a, is_active=True).count()
        self.assertEqual(staff_count, 6)
        
        # Create Expired Subscription (Expired yesterday)
        plan = Plan.objects.create(name="Expired Plan", price=0, duration_days=30)
        expired_sub = Subscription.objects.create(
            business=self.business_a,
            plan=plan,
            plan_name=plan.name,
            start_date=timezone.now() - timedelta(days=40),
            end_date=timezone.now() - timedelta(days=1),
            is_active=True
        )
        
        # Call Task
        deactivate_expired_subscriptions()
        
        # Verify Results: resources limited back to 1 (the first/default found remains)
        self.assertEqual(Branch.objects.filter(business=self.business_a, is_active=True).count(), 1)
        self.assertEqual(Product.objects.filter(business=self.business_a, is_active=True).count(), 1)
        self.assertEqual(User.objects.filter(business_roles__business=self.business_a, is_active=True).count(), 1)
        
        # Expired subscription should be deleted
        self.assertFalse(Subscription.objects.filter(id=expired_sub.id).exists())
