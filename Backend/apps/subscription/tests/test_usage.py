from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.subscription.models import Subscription, Usage, Plan

class UsageTest(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        # Clean subscription for deterministic testing
        Subscription.objects.all().delete()
        Usage.objects.all().delete()
        self.plan = self.create_plan(name="Usage Plan", max_products=10, max_staff=10, max_invoices=10, max_branches=10)
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.post(reverse('subscription_plan-plan-purchase'), {"plan_id": self.plan.id}, format='json')
        self.sub_id = res.data["subscription_id"]
        self.url_usage = reverse('subscription_plan-plan-usage', args=[self.sub_id])

    def test_product_created(self):
        """Product creation increments usage."""
        res_initial = self.client.get(self.url_usage)
        initial = res_initial.data["product_created"]

        data = {"name": "Usage Product", "sku": "U-001", "base_price": 10.0, "cost_price": 5.0, "input_gst_rate": 18.0, "output_gst_rate": 18.0}
        self.client.post(reverse('product-list'), data, format='json')
        
        res_final = self.client.get(self.url_usage)
        self.assertEqual(res_final.data["product_created"], initial + 1)

    def test_invoices_created(self):
        """Invoice creation increments usage."""
        res_initial = self.client.get(self.url_usage)
        initial = res_initial.data["invoices_created"]

        # Valid invoice data with nested customer and invoice_items
        data = {
            "customer": {
                "name": "New Customer Usage",
                "mobile_number": "9998887776"
            },
            "branch_id": self.branch_a1.id,
            "payment_mode": "CASH",
            "invoice_items": [
                {
                    "product_id": self.product_a1.id,
                    "quantity": 2,
                    "selling_price": 50.0,
                    "base_price": 45.0
                }
            ]
        }
        res_p = self.client.post(reverse('invoice-list'), data, format='json')
        self.assertIn(res_p.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])
        
        res_final = self.client.get(self.url_usage)
        self.assertEqual(res_final.data["invoices_created"], initial + 1)

    def test_staff_created(self):
        """Staff (manager/employee) creation increments usage."""
        res_initial = self.client.get(self.url_usage)
        initial = res_initial.data["staff_created"]

        # Manager with nested user and details
        # ManagerSerializer expects 'user', 'employee_details', 'assigned_branches'
        # Complex password to satisfy 'This password is too common'
        manager_data = {
            "user": {
                "username": "new_manager_usage_h_final", 
                "password": "P@ssw0rd_2024_Test!", 
                "mobile_number": "1112229992", 
                "first_name": "M"
            },
            "employee_details": {
                "employee_id": "MGR201",
                "designation": "Manager"
            },
            "assigned_branches": [
                {"id": self.branch_a1.id}
            ]
        }
        res_m = self.client.post(reverse('business-manager'), manager_data, format='json')
        self.assertEqual(res_m.status_code, status.HTTP_201_CREATED)
        
        # Employee
        employee_data = {
             "user": {
                "username": "new_employee_usage_h_final", 
                "password": "P@ssw0rd_2024_Test!", 
                "mobile_number": "1112228882", 
                "first_name": "E"
            },
            "employee_details": {
                "employee_id": "EMP201",
                "designation": "Employee"
            },
            "assigned_branches": [
                {"id": self.branch_a1.id}
            ]
        }
        res_e = self.client.post(reverse('business-employee'), employee_data, format='json')
        self.assertEqual(res_e.status_code, status.HTTP_201_CREATED)
        
        res_final = self.client.get(self.url_usage)
        self.assertEqual(res_final.data["staff_created"], initial + 2)

    def test_branches_created(self):
        """Branch creation increments usage."""
        res_initial = self.client.get(self.url_usage)
        initial = res_initial.data["branches_created"]

        data = {"name": "New Branch Robust Final"}
        res_b = self.client.post(reverse('branch-list'), data, format='json')
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        
        res_final = self.client.get(self.url_usage)
        self.assertEqual(res_final.data["branches_created"], initial + 1)

    def test_entitlements(self):
        """Check access to Chat, AI Agent, and Analytics based on entitlements."""
        # --- 1. FULL ACCESS ---
        full_plan = self.create_plan(
            name="Full Plan Robust Ent", 
            has_chat=True, 
            has_ai_agent=True, 
            has_advanced_analytics=True
        )
        self.client.post(reverse('subscription_plan-plan-purchase'), {"plan_id": full_plan.id}, format='json')
        
        # Check Advanced Analytics (Product, Customer, Report)
        self.assertEqual(self.client.get(reverse('analysis-product-details')).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse('customer-customer-leaderboard-revenue')).status_code, status.HTTP_200_OK)
        # Report is a POST generate action
        self.assertEqual(self.client.get(reverse('report-report')).status_code, status.HTTP_405_METHOD_NOT_ALLOWED) # 200 is for GET, but we check permission exists (403 vs 405)

        # Check Chat (Message, Broadcast, Conversation)
        self.assertEqual(self.client.get(reverse('messages-list')).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.get(reverse('broadcast-list')).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse('conversation-list')).status_code, status.HTTP_200_OK)

        # Check AI Agent
        res_ai_ok = self.client.get(reverse('ai-chat-session-list'))
        self.assertEqual(res_ai_ok.status_code, status.HTTP_200_OK)

        # --- 2. RESTRICTED ACCESS ---
        no_plan = self.create_plan(
            name="No Feature Plan", 
            has_chat=False, 
            has_ai_agent=False, 
            has_advanced_analytics=False
        )
        # Clear cache/subscriptions ensures fresh check
        Subscription.objects.all().delete()
        self.client.post(reverse('subscription_plan-plan-purchase'), {"plan_id": no_plan.id}, format='json')

        # Verify 403 Forbidden for all
        self.assertEqual(self.client.get(reverse('analysis-product-details')).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(reverse('customer-customer-leaderboard-revenue')).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(reverse('report-report')).status_code, status.HTTP_403_FORBIDDEN)

        self.assertEqual(self.client.get(reverse('messages-list')).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(reverse('broadcast-list')).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(reverse('conversation-list')).status_code, status.HTTP_403_FORBIDDEN)

        res_ai_403 = self.client.get(reverse('ai-chat-session-list'))
        self.assertEqual(res_ai_403.status_code, status.HTTP_403_FORBIDDEN)


    def test_create_limits_refusal(self):
        """Verify that creation is refused when limits are reached."""
        # 1. Purchase plan with exactly current products + 0
        from apps.product.models import Product
        p_count = Product.objects.filter(business=self.business_a).count()
        
        limit_plan = self.create_plan(
            name="Limit Refusal Plan Robust Final", 
            max_products=p_count, 
            max_staff=10, 
            max_invoices=0 # Should fail first invoice
        )
        Subscription.objects.all().delete()
        res_pur = self.client.post(reverse('subscription_plan-plan-purchase'), {"plan_id": limit_plan.id}, format='json')
        self.assertIn(res_pur.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # --- Products Refusal ---
        product_data = {"name": "Over Limit Product", "sku": "OL-888", "base_price": 10.0, "cost_price": 5.0, "input_gst_rate": 18.0, "output_gst_rate": 18.0}
        res_p = self.client.post(reverse('product-list'), product_data, format='json')
        self.assertEqual(res_p.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Limit reached", res_p.data["message"])

        # --- Invoices Refusal ---
        inv_data = {
            "customer": {"name": "Inv Limit Customer", "mobile_number": "1112223335"},
            "branch_id": self.branch_a1.id,
            "payment_mode": "CASH", 
            "invoice_items": [{"product_id": self.product_a1.id, "quantity": 1, "selling_price": 10.0, "base_price": 9.0}]
        }
        res_inv = self.client.post(reverse('invoice-list'), inv_data, format='json')
        self.assertEqual(res_inv.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("limit reached", res_inv.data["message"].lower())