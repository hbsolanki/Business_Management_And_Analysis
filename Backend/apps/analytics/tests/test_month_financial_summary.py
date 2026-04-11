from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType

class MonthFinancialSummaryTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        
        # Use the summaries created in BaseTestCase
        # self.summary_branch_a1 is 2024-03
        self.summary_year = 2024
        self.summary_month = 3
        
        self.url_breakdown = reverse('month_financial_summary-month-breakdown')

    def test_permission(self):
        """Owner and Manager can view, Employee without permission cannot initially, then can after assignment."""
        # 1. Owner - Success
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.url_breakdown}?year={self.summary_year}&month={self.summary_month}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 2. Manager - Success
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(f"{self.url_breakdown}?year={self.summary_year}&month={self.summary_month}&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 3. Employee without permission - Forbidden
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(f"{self.url_breakdown}?year={self.summary_year}&month={self.summary_month}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Give permission via assign_work_to_user and check again
        self.client.force_authenticate(user=self.employee_a1)
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.ANALYTICS)
        
        # Refresh user objects to clear internal permission and group cache
        self.employee_a1 = self.employee_a1.__class__.objects.get(id=self.employee_a1.id)
        if hasattr(self.employee_a1, '_perm_cache'):
            del self.employee_a1._perm_cache
            
        self.client.force_authenticate(user=self.employee_a1)
        # Employee must specify branch and it must be their branch
        response = self.client.get(f"{self.url_breakdown}?year={self.summary_year}&month={self.summary_month}&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_month_breakdown(self):
        """Verify all fields in the breakdown response."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.url_breakdown}?year={self.summary_year}&month={self.summary_month}&branch={self.branch_a1.id}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # Check all 14 requested fields
        expected_fields = [
            'year', 'month', 'total_revenue', 'cost_of_goods_sold', 
            'gross_profit', 'operating_expenses', 'salary_expenses', 
            'total_expenses', 'net_profit_before_tax', 'invoice_count',
            'input_gst', 'output_gst', 'gst_payable', 'cost_category_items'
        ]
        
        for field in expected_fields:
            self.assertIn(field, data, f"Field '{field}' missing from response")

        # Verify specific values logic (Matches BaseTestCase setup)
        self.assertEqual(int(data['year']), self.summary_year)
        self.assertEqual(int(data['month']), self.summary_month)
        self.assertEqual(float(data['total_revenue']), 5000.00)
        self.assertEqual(float(data['gross_profit']), 3000.00) # 5000 - 2000
        self.assertEqual(float(data['total_expenses']), 1500.00) # 500 + 1000
        self.assertEqual(float(data['net_profit_before_tax']), 1500.00) # 3000 - 1500
        self.assertEqual(float(data['gst_payable']), 300.00) # 500 - 200
        self.assertEqual(len(data['cost_category_items']), 1)
        # Note: In BaseTestCase it's 'Test Category A'
        self.assertEqual(data['cost_category_items'][0]['category_name'], "Test Category A")

    def test_month_breakdown_filter(self):
        """Test breakdown filtering with right/wrong month, year, and branch."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Right Month & Year (No branch - Aggregates A1, A2, and Global)
        # Base setup: Global(10k) + BranchA1(5k) + BranchA2(5k) = 20k
        response = self.client.get(f"{self.url_breakdown}?year=2024&month=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['total_revenue']), 20000.0)

        # 2. Wrong Month (Specified branch for 404 check)
        response = self.client.get(f"{self.url_breakdown}?year=2024&month=4&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 3. Wrong Year (Specified branch for 404 check)
        response = self.client.get(f"{self.url_breakdown}?year=2023&month=3&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Right Branch (Branch A1)
        response = self.client.get(f"{self.url_breakdown}?year=2024&month=3&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['total_revenue']), 5000.0)

        # 5. Wrong Branch ID for this business
        response = self.client.get(f"{self.url_breakdown}?year=2024&month=3&branch=9999")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 6. Manager Access (Correct Branch)
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(f"{self.url_breakdown}?year=2024&month=3&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 7. Manager Access (Other Branch)
        response = self.client.get(f"{self.url_breakdown}?year=2024&month=3&branch={self.branch_a2.id}")
        # Manager is restricted to their branch by viewset isolation or filter
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_month_net_profit(self):
        """Test net profit API with direct value checks (Hardcoded Business A Aggregates)."""
        self.client.force_authenticate(user=self.owner_a)
        # Using hardcoded path to ensure test reliability in various environments
        url = "/analytics/month/netprofit/"
        response = self.client.get(f"{url}?year=2024&month=3")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)
        
        # Accessing first item directly (filtered by query params)
        item = response.data[0]
        
        # Value Verification (Business A Aggregated March 2024: 6000.0)
        self.assertEqual(int(item['month']), 3)
        self.assertEqual(int(item['year']), 2024)
        self.assertEqual(float(item['net_profit_before_tax']), 6000.0)

    def test_test_month_net_profit_filter(self):
        """Test net profit filtering with various date range values."""
        self.client.force_authenticate(user=self.owner_a)
        url = "/analytics/month/netprofit/"

        # 1. Valid Range (March 2024 to March 2024)
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # 2. Broader Range (Jan 2024 to Dec 2024)
        response = self.client.get(f"{url}?start_month=1&start_year=2024&end_month=12&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find at least our March 2024 data
        self.assertTrue(len(response.data) >= 1)

        # 3. Invalid Range (Future)
        response = self.client.get(f"{url}?start_month=1&start_year=2025&end_month=12&end_year=2025")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # 4. Incomplete Parameters (Missing start_month) fallback to all (as per filter logic)
        response = self.client.get(f"{url}?start_year=2024&end_month=3&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

        # 5. Range with Branch filter
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        # Branch A1 profit is 1500
        self.assertEqual(float(response.data[0]['net_profit_before_tax']), 1500.0)

    def test_financial_trend(self):
        """Test financial trend API fields and aggregated values."""
        self.client.force_authenticate(user=self.owner_a)
        url = "/analytics/month/financial_trend/"
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)
        
        item = response.data[0]
        
        # Field Verification
        expected_fields = [
            'month', 'year', 'total_revenue', 'total_expenses', 
            'net_profit_before_tax', 'gross_profit'
        ]
        for field in expected_fields:
            self.assertIn(field, item, f"Field '{field}' missing from financial trend")

        # Value Verification (Business A Aggregated March 2024)
        # Revenue 20k, COGS 8k, Exp 6k -> GP 12k, NP 6k
        self.assertEqual(int(item['month']), 3)
        self.assertEqual(int(item['year']), 2024)
        self.assertEqual(float(item['total_revenue']), 20000.0)
        self.assertEqual(float(item['total_expenses']), 6000.0)
        self.assertEqual(float(item['gross_profit']), 12000.0)
        self.assertEqual(float(item['net_profit_before_tax']), 6000.0)

    def test_financial_trend_filter(self):
        """Test financial trend filtering with various date combinations and expected precise values."""
        self.client.force_authenticate(user=self.owner_a)
        url = "/analytics/month/financial_trend/"
        expected_fields = ['month', 'year', 'total_revenue', 'total_expenses', 'net_profit_before_tax', 'gross_profit']

        # 1. Full Match (Aggregated March 2024)
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        
        # Field Verification
        for field in expected_fields:
             self.assertIn(field, item, f"Field '{field}' missing from response 1")

        # Aggregated Verification (Revenue 20k, GP 12k, NP 6k, Exp 6k)
        self.assertEqual(float(item['total_revenue']), 20000.0)
        self.assertEqual(float(item['gross_profit']), 12000.0)
        self.assertEqual(float(item['total_expenses']), 6000.0)
        self.assertEqual(float(item['net_profit_before_tax']), 6000.0)

        # 2. Branch A1 Specific
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        
        # Branch A1 Verification (Rev 5k, COGS 2k, Exp 1.5k -> GP 3k, NP 1.5k)
        self.assertEqual(float(item['total_revenue']), 5000.0)
        self.assertEqual(float(item['gross_profit']), 3000.0)
        self.assertEqual(float(item['total_expenses']), 1500.0)
        self.assertEqual(float(item['net_profit_before_tax']), 1500.0)

        # 3. Future Range (Zero results)
        response = self.client.get(f"{url}?start_month=1&start_year=2025&end_month=12&end_year=2025")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # 4. Incomplete Parameters (Falling back to all as per start_month check)
        response = self.client.get(f"{url}?start_year=2024&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)
        item = response.data[0] # Matches first found (likely Global 3k NP)
        self.assertIn('total_revenue', item)

    def test_tax_analytics(self):
        """Test tax analytics fields and aggregated values."""
        self.client.force_authenticate(user=self.owner_a)
        # Using underscored path as verified in viewset
        url = "/analytics/month/tax_analytics/"
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)
        
        item = response.data[0]
        
        # Field Verification
        expected_fields = ['month', 'year', 'input_gst', 'output_gst', 'gst_payable']
        for field in expected_fields:
            self.assertIn(field, item, f"Field '{field}' missing from tax analytics")

        # Value Verification (Business A Aggregated March 2024)
        # Input 800 (400+200+200), Output 2000 (1000+500+500) -> Payable 1200
        self.assertEqual(int(item['month']), 3)
        self.assertEqual(int(item['year']), 2024)
        self.assertEqual(float(item['input_gst']), 800.0)
        self.assertEqual(float(item['output_gst']), 2000.0)
        self.assertEqual(float(item['gst_payable']), 1200.0)

    def test_tax_analytics_filter(self):
        """Test tax analytics filtering with various date range and branch combinations."""
        self.client.force_authenticate(user=self.owner_a)
        url = "/analytics/month/tax_analytics/"
        expected_fields = ['month', 'year', 'input_gst', 'output_gst', 'gst_payable']

        # 1. Full Match (Aggregated March 2024)
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        for field in expected_fields:
             self.assertIn(field, item, f"Field '{field}' missing from tax filter 1")
        self.assertEqual(float(item['input_gst']), 800.0)
        self.assertEqual(float(item['output_gst']), 2000.0)

        # 2. Branch A1 Specific
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        for field in expected_fields:
             self.assertIn(field, item, f"Field '{field}' missing from tax filter 2")
        # Branch A1: Input 200, Output 500
        self.assertEqual(float(item['input_gst']), 200.0)
        self.assertEqual(float(item['output_gst']), 500.0)

    def test_profit_margins(self):
        """Test profit margin API fields and aggregated values."""
        self.client.force_authenticate(user=self.owner_a)
        url = "/analytics/month/profit_margins/"
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)
        
        item = response.data[0]
        
        # Field Verification
        expected_fields = ['month', 'year', 'total_revenue', 'net_profit_before_tax', 'net_profit_margin', 'gross_profit_margin']
        for field in expected_fields:
            self.assertIn(field, item, f"Field '{field}' missing from profit margins")

        # Value Verification (Business A Aggregated March 2024)
        # Revenue 20k, NP 6k, GP 12k -> NPM 30.0%, GPM 60.0%
        self.assertEqual(int(item['month']), 3)
        self.assertEqual(int(item['year']), 2024)
        self.assertEqual(float(item['total_revenue']), 20000.0)
        self.assertEqual(float(item['net_profit_before_tax']), 6000.0)
        self.assertEqual(float(item['net_profit_margin']), 30.0)
        self.assertEqual(float(item['gross_profit_margin']), 60.0)

    def test_profit_margins_filter(self):
        """Test profit margin filtering with various date range and branch combinations."""
        self.client.force_authenticate(user=self.owner_a)
        url = "/analytics/month/profit_margins/"
        expected_fields = ['month', 'year', 'total_revenue', 'net_profit_before_tax', 'net_profit_margin', 'gross_profit_margin']

        # 1. Full Match (Aggregated March 2024)
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        for field in expected_fields:
             self.assertIn(field, item, f"Field '{field}' missing from margins filter 1")
        self.assertEqual(float(item['total_revenue']), 20000.0)
        self.assertEqual(float(item['net_profit_margin']), 30.0)

        # 2. Broader Range
        response = self.client.get(f"{url}?start_month=1&start_year=2024&end_month=12&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

        # 3. Branch A1 Specific
        response = self.client.get(f"{url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        for field in expected_fields:
             self.assertIn(field, item, f"Field '{field}' missing from margins filter 2")
        # Branch A1: Rev 5k, NP 1.5k -> NPM 30.0%, GPM 60.0%
        self.assertEqual(float(item['total_revenue']), 5000.0)
        self.assertEqual(float(item['net_profit_margin']), 30.0)
        self.assertEqual(float(item['gross_profit_margin']), 60.0)

        # 4. Future Range
        response = self.client.get(f"{url}?start_month=1&start_year=2025&end_month=12&end_year=2025")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # 5. Incomplete Parameters (Falling back skip as name!='start_month')
        response = self.client.get(f"{url}?start_year=2024&end_year=2024")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)
        item = response.data[0]
        for field in expected_fields:
             self.assertIn(field, item, f"Field '{field}' missing from margins filter 3")