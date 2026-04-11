from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.subscription.models import Plan, Subscription

class SubscriptionTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.url_plans = reverse('subscription_plan-plans-details')
        self.url_purchase = reverse('subscription_plan-plan-purchase')
        self.url_purchased = reverse('subscription_plan-purchased-plan')
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
        Subscription.objects.all().delete() # Start clean for deterministic limits
        self.client.force_authenticate(user=self.owner_a)
        plan = Plan.objects.first()
        data = {"plan_id": plan.id}
        response = self.client.post(self.url_purchase, data, format='json')
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
        response = self.client.post(self.url_purchase, {"plan_id": 9999}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan_id", response.data)

        # 3. Empty plan ID
        response = self.client.post(self.url_purchase, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Cumulative Logic (Upgrade)
        # Initial purchase has N products. Second purchase should add another M.
        Subscription.objects.all().delete() # Clean state again
        
        # Second buy
        self.client.post(self.url_purchase, {"plan_id": plan.id}, format='json')
        # Third buy (cumulative check)
        self.client.post(self.url_purchase, {"plan_id": plan.id}, format='json')
        
        response = self.client.get(self.url_purchased)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Cumulative: plan.max_products * 2
        self.assertEqual(response.data["max_products"], plan.max_products * 2)
        self.assertEqual(response.data["max_staff"], plan.max_staff * 2)
        self.assertEqual(response.data["max_invoices"], plan.max_invoices * 2)

    def test_purchased_plan(self):
        pass

    def test_plan_usage(self):
        """Owner can view plan usage stats and verify increments via API."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Ensure fresh subscription
        Subscription.objects.all().delete()
        plan = Plan.objects.first()
        res = self.client.post(self.url_purchase, {"plan_id": plan.id}, format='json')
        sub_id = res.data["subscription_id"]
        
        url_usage = reverse('subscription_plan-plan-usage', args=[sub_id])
        
        # 1. Initial usage
        response = self.client.get(url_usage)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        initial_products = response.data["product_created"]

        # 2. Create a product via API to trigger Usage update
        url_product_create = reverse('product-list') # Or similar
        product_data = {
            "name": "Test Usage Product API", 
            "sku": "TU-API-001", 
            "base_price": 10.0, 
            "cost_price": 5.0,
            "input_gst_rate": 18.0,
            "output_gst_rate": 18.0
        }
        res_p = self.client.post(url_product_create, product_data, format='json')
        self.assertEqual(res_p.status_code, status.HTTP_201_CREATED)
        
        # 3. Verify increment
        response = self.client.get(url_usage)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["product_created"], initial_products + 1)
