from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog

class ActivityLogTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.url_logs = reverse('activity-log-list')

    def test_activity_log_read_by_owner(self):
        # Create some logs for different branches
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a1, message="Log A1")
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a2, message="Log A2")
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.url_logs)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Owner should see both logs for business A
        logs = [log_item['message'] for log_item in response.data['results']]
        self.assertIn("Log A1", logs)
        self.assertIn("Log A2", logs)
    
    def test_activity_log_read_by_manager_on_assigned_branch(self):
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a1, message="Log A1")
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a2, message="Log A2")
        
        # manager_a1 is assigned to branch_a1
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(self.url_logs)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        messages = [log_item['message'] for log_item in response.data['results']]
        self.assertIn("Log A1", messages)
        self.assertNotIn("Log A2", messages)

    def test_activity_log_read_by_manager_on_unassigned_branch(self):
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a2, message="Log A2")
        
        # manager_a1 is NOT in branch_a2
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(f"{self.url_logs}?branch={self.branch_a2.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_activity_log_read_by_employee(self):
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(self.url_logs)
        # Employees are forbidden by IsOwnerOrManager
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activity_log_read_by_owner_other_business(self):
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a1, message="Business A Log")
        
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get(self.url_logs)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # owner_b should NOT see logs from business A
        messages = [log_item['message'] for log_item in response.data['results']]
        self.assertNotIn("Business A Log", messages)

    def test_activity_log_read_by_manager_on_assigned_branch_other_business(self):
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a1, message="Secret A")
        
        self.client.force_authenticate(user=self.manager_b1)
        response = self.client.get(self.url_logs)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        messages = [log_item['message'] for log_item in response.data['results']]
        self.assertNotIn("Secret A", messages)

    def test_activity_log_read_by_manager_on_unassigned_branch_other_business(self):
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, self.branch_a2, message="Secret A2")
        
        self.client.force_authenticate(user=self.manager_b1)
        # Querying another business's branch explicitly
        response = self.client.get(f"{self.url_logs}?branch={self.branch_a2.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_activity_log_read_by_employee_other_business(self):
        self.client.force_authenticate(user=self.employee_b1)
        response = self.client.get(self.url_logs)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- FILTERING ---

    def test_activity_log_filtering_combinations(self):
        """Test log filters."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Seed logs
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE, self.branch_a1, message="l1")
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.UPDATE, ActivityLog.Module.PRODUCT, self.branch_a1, message="l2")
        ActivityLog.objects.log(self.business_a, self.manager_a1, ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE, self.branch_a1, message="l3")
        ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE, self.branch_a2, message="l4")

        # 1. Actor filter
        response = self.client.get(f"{self.url_logs}?actor={self.manager_a1.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["actor"], self.manager_a1.id)
        
        # 2. Module filter
        response = self.client.get(f"{self.url_logs}?module={ActivityLog.Module.PRODUCT}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["module"], ActivityLog.Module.PRODUCT)
        
        # 3. Action filter
        response = self.client.get(f"{self.url_logs}?action={ActivityLog.Action.UPDATE}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["action"], ActivityLog.Action.UPDATE)
        
        # 4. Branch filter
        response = self.client.get(f"{self.url_logs}?branch={self.branch_a2.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a2.id)

        # 5. Actor + Module
        response = self.client.get(f"{self.url_logs}?actor={self.owner_a.id}&module={ActivityLog.Module.INVOICE}")
        # owner_a + INVOICE = l1, l4
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["actor"], self.owner_a.id)
        self.assertEqual(response.data["results"][0]["module"], ActivityLog.Module.INVOICE)
        self.assertEqual(response.data["results"][1]["actor"], self.owner_a.id)
        self.assertEqual(response.data["results"][1]["module"], ActivityLog.Module.INVOICE)

        # 6. Actor + Action
        response = self.client.get(f"{self.url_logs}?actor={self.owner_a.id}&action={ActivityLog.Action.CREATE}")
        # owner_a + CREATE = l1, l4
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["actor"], self.owner_a.id)
        self.assertEqual(response.data["results"][0]["action"], ActivityLog.Action.CREATE)
        self.assertEqual(response.data["results"][1]["actor"], self.owner_a.id)
        self.assertEqual(response.data["results"][1]["action"], ActivityLog.Action.CREATE)

        # 7. Module + Action
        response = self.client.get(f"{self.url_logs}?module={ActivityLog.Module.INVOICE}&action={ActivityLog.Action.CREATE}")
        # INVOICE + CREATE = l1, l3, l4
        self.assertEqual(len(response.data["results"]), 3)
        self.assertEqual(response.data["results"][0]["module"], ActivityLog.Module.INVOICE)
        self.assertEqual(response.data["results"][0]["action"], ActivityLog.Action.CREATE)
        self.assertEqual(response.data["results"][1]["module"], ActivityLog.Module.INVOICE)
        self.assertEqual(response.data["results"][1]["action"], ActivityLog.Action.CREATE)
        self.assertEqual(response.data["results"][2]["module"], ActivityLog.Module.INVOICE)
        self.assertEqual(response.data["results"][2]["action"], ActivityLog.Action.CREATE)

        # 8. Branch + Module
        response = self.client.get(f"{self.url_logs}?branch={self.branch_a1.id}&module={ActivityLog.Module.PRODUCT}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)
        self.assertEqual(response.data["results"][0]["module"], ActivityLog.Module.PRODUCT)

        # 9. Branch + Action
        response = self.client.get(f"{self.url_logs}?branch={self.branch_a1.id}&action={ActivityLog.Action.CREATE}")
        # branch_a1 + CREATE = l1, l3
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)
        self.assertEqual(response.data["results"][0]["action"], ActivityLog.Action.CREATE)
        self.assertEqual(response.data["results"][1]["branch"], self.branch_a1.id)
        self.assertEqual(response.data["results"][1]["action"], ActivityLog.Action.CREATE)

        # 10. All filters
        response = self.client.get(
            f"{self.url_logs}?actor={self.owner_a.id}&module={ActivityLog.Module.INVOICE}&action={ActivityLog.Action.CREATE}&branch={self.branch_a1.id}"
        )
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["message"], "l1")
        self.assertEqual(response.data["results"][0]["actor"], self.owner_a.id)
        self.assertEqual(response.data["results"][0]["module"], ActivityLog.Module.INVOICE)
        self.assertEqual(response.data["results"][0]["action"], ActivityLog.Action.CREATE)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)

        # 11. Non-existent actor
        response = self.client.get(f"{self.url_logs}?actor=99999")
        self.assertEqual(len(response.data["results"]), 0)

        # 12. Non-existent branch
        response = self.client.get(f"{self.url_logs}?branch=99999")
        self.assertEqual(len(response.data["results"]), 0)

    # --- PAGINATION ---

    def test_activity_log_pagination(self):
        """Test log pagination."""
        self.client.force_authenticate(user=self.owner_a)
        # Seed 7 logs
        for i in range(7):
            ActivityLog.objects.log(self.business_a, self.owner_a, ActivityLog.Action.CREATE, ActivityLog.Module.OTHER, self.branch_a1, message=f"extra {i}")
            
        # Page 1 (size 6)
        response = self.client.get(self.url_logs)
        self.assertEqual(len(response.data["results"]), 6)
        
        # Page 2
        response = self.client.get(response.data["next"])
        self.assertTrue(len(response.data["results"]) >= 1)
