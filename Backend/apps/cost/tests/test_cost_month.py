from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase


class CostMonthTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('cost-list')

    def test_cost_month_read_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check counts
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 3)

        # Check full details are populated as requested
        summary = self.summary_branch_a1
        expected_item = next((item for item in data if item["id"] == summary.id), None)
        self.assertIsNotNone(expected_item)
        
        self.assertEqual(expected_item["year"], summary.year)
        self.assertEqual(expected_item["month"], summary.month)
        self.assertEqual(expected_item["branch"], summary.branch.id)
        self.assertEqual(str(expected_item["total_revenue"]), str(summary.total_revenue))
        self.assertEqual(str(expected_item["cost_of_goods_sold"]), str(summary.cost_of_goods_sold))
        self.assertEqual(str(expected_item["total_expenses"]), str(summary.total_expenses))
        self.assertEqual(str(expected_item["gross_profit"]), str(summary.gross_profit))
        self.assertEqual(str(expected_item["net_profit_before_tax"]), str(summary.net_profit_before_tax))
        self.assertEqual(str(expected_item["operating_expenses"]), str(summary.operating_expenses))
        self.assertEqual(str(expected_item["salary_expenses"]), str(summary.salary_expenses))
        self.assertEqual(str(expected_item["input_gst"]), str(summary.input_gst))
        self.assertEqual(str(expected_item["output_gst"]), str(summary.output_gst))
        self.assertEqual(str(expected_item["gst_payable"]), str(summary.gst_payable))
        self.assertEqual(expected_item["invoice_count"], summary.invoice_count)
        self.assertIn("cost_category_items", expected_item)
        
        if summary.product_performance.exists():
            perf = summary.product_performance.first()
            perf_data = expected_item["product_performance"][0]
            self.assertEqual(perf_data["id"], perf.id)
            self.assertEqual(perf_data["product_name"], perf.product.name if perf.product else None)
            self.assertEqual(perf_data["product_sku"], perf.product.sku if perf.product else None)
            self.assertEqual(str(perf_data["cost"]), str(perf.cost))
            self.assertEqual(perf_data["product_category_name"], perf.product.category.name if perf.product and perf.product.category else None)
            self.assertEqual(str(perf_data["revenue"]), str(perf.revenue))
            self.assertEqual(perf_data["product_id"], perf.product.id if perf.product else None)
            self.assertEqual(perf_data["quantity"], perf.quantity)

    def test_cost_month_read_by_manager_assigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)

        # Check assigned
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['id'], self.summary_branch_a1.id)

    def test_cost_month_read_by_manager_unassigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)

        # Check unassigned
        response = self.client.get(self.list_url, {"branch": self.branch_a2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)

    def test_cost_month_read_by_employee_assigned_branch(self):
        self.client.force_authenticate(user=self.employee_a1)

        # Check forbidden
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cost_month_read_by_employee_unassigned_branch(self):
        self.client.force_authenticate(user=self.employee_a1)

        # Check forbidden
        response = self.client.get(self.list_url, {"branch": self.branch_a2.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cost_month_read_by_owner_other_business(self):
        self.client.force_authenticate(user=self.owner_b)

        # Check isolation - should see only Business B's data
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        # We expect 3 summaries for Business B, and 0 for Business A
        self.assertEqual(len(data), 3)

    def test_cost_month_read_by_manager_other_business(self):
        self.client.force_authenticate(user=self.manager_b1)

        # Manager B1 sees only Branch B1
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['id'], self.summary_branch_b1.id)

    def test_cost_month_read_by_employee_other_business(self):
        self.client.force_authenticate(user=self.employee_b1)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
