import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def financial_summary_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestMonthFinancialSummaryPytest:

    def test_permission(self, api_client, financial_summary_env):
        """Owner and Manager can view, Employee without permission cannot initially, then can after assignment."""
        # Arrange
        sut_client = api_client
        sut_url_breakdown = reverse('month_financial_summary-month-breakdown')
        summary_year = 2024
        summary_month = 3

        # 1. Owner - Success
        # Arrange
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        # Act
        res_owner = sut_client.get(f"{sut_url_breakdown}?year={summary_year}&month={summary_month}")
        # Assert
        assert res_owner.status_code == status.HTTP_200_OK

        # 2. Manager - Success
        # Arrange
        sut_client.force_authenticate(user=financial_summary_env.manager_a1)
        # Act
        res_manager = sut_client.get(f"{sut_url_breakdown}?year={summary_year}&month={summary_month}&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res_manager.status_code == status.HTTP_200_OK

        # 3. Employee without permission - Forbidden
        # Arrange
        sut_client.force_authenticate(user=financial_summary_env.employee_a1)
        # Act
        res_emp_forbid = sut_client.get(f"{sut_url_breakdown}?year={summary_year}&month={summary_month}")
        # Assert
        assert res_emp_forbid.status_code == status.HTTP_403_FORBIDDEN

        # 4. Give permission via assign_work_to_user and check again
        # Arrange
        financial_summary_env.assign_work_to_user(financial_summary_env.employee_a1, financial_summary_env.branch_a1, WorkType.ANALYTICS)
        financial_summary_env.employee_a1 = financial_summary_env.employee_a1.__class__.objects.get(id=financial_summary_env.employee_a1.id)
        if hasattr(financial_summary_env.employee_a1, '_perm_cache'):
            del financial_summary_env.employee_a1._perm_cache
        sut_client.force_authenticate(user=financial_summary_env.employee_a1)
        # Act
        res_emp_allow = sut_client.get(f"{sut_url_breakdown}?year={summary_year}&month={summary_month}&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res_emp_allow.status_code == status.HTTP_200_OK

    def test_month_breakdown(self, api_client, financial_summary_env):
        """Verify all fields in the breakdown response."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = f"{reverse('month_financial_summary-month-breakdown')}?year=2024&month=3&branch={financial_summary_env.branch_a1.id}"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        data = sut_response.data
        expected_fields = [
            'year', 'month', 'total_revenue', 'cost_of_goods_sold', 
            'gross_profit', 'operating_expenses', 'salary_expenses', 
            'total_expenses', 'net_profit_before_tax', 'invoice_count',
            'input_gst', 'output_gst', 'gst_payable', 'cost_category_items'
        ]
        for field in expected_fields:
            assert field in data, f"Field '{field}' missing from response"

        assert int(data['year']) == 2024
        assert int(data['month']) == 3
        assert float(data['total_revenue']) == 5000.00
        assert float(data['gross_profit']) == 3000.00
        assert float(data['total_expenses']) == 1500.00
        assert float(data['net_profit_before_tax']) == 1500.00
        assert float(data['gst_payable']) == 300.00
        assert len(data['cost_category_items']) == 1
        assert data['cost_category_items'][0]['category_name'] == "Test Category A"

    def test_month_breakdown_filter(self, api_client, financial_summary_env):
        """Test breakdown filtering with right/wrong month, year, and branch."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = reverse('month_financial_summary-month-breakdown')

        # 1. Right Month & Year (No branch)
        # Act
        res1 = sut_client.get(f"{sut_url}?year=2024&month=3")
        # Assert
        assert res1.status_code == status.HTTP_200_OK
        assert float(res1.data['total_revenue']) == 20000.0

        # 2. Wrong Month
        # Act
        res2 = sut_client.get(f"{sut_url}?year=2024&month=4&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res2.status_code == status.HTTP_404_NOT_FOUND

        # 3. Wrong Year
        # Act
        res3 = sut_client.get(f"{sut_url}?year=2023&month=3&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res3.status_code == status.HTTP_404_NOT_FOUND

        # 4. Right Branch
        # Act
        res4 = sut_client.get(f"{sut_url}?year=2024&month=3&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res4.status_code == status.HTTP_200_OK
        assert float(res4.data['total_revenue']) == 5000.0

        # 5. Wrong Branch ID
        # Act
        res5 = sut_client.get(f"{sut_url}?year=2024&month=3&branch=9999")
        # Assert
        assert res5.status_code == status.HTTP_404_NOT_FOUND

        # 6. Manager Access (Correct Branch)
        # Arrange
        sut_client.force_authenticate(user=financial_summary_env.manager_a1)
        # Act
        res6 = sut_client.get(f"{sut_url}?year=2024&month=3&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res6.status_code == status.HTTP_200_OK

        # 7. Manager Access (Other Branch)
        # Act
        res7 = sut_client.get(f"{sut_url}?year=2024&month=3&branch={financial_summary_env.branch_a2.id}")
        # Assert
        assert res7.status_code == status.HTTP_404_NOT_FOUND

    def test_month_net_profit(self, api_client, financial_summary_env):
        """Test net profit API with direct value checks."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/netprofit/?year=2024&month=3"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert isinstance(sut_response.data, list)
        assert len(sut_response.data) > 0
        item = sut_response.data[0]
        assert int(item['month']) == 3
        assert int(item['year']) == 2024
        assert float(item['net_profit_before_tax']) == 6000.0

    def test_test_month_net_profit_filter(self, api_client, financial_summary_env):
        """Test net profit filtering with various date range values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/netprofit/"

        # 1. Valid Range
        # Act
        res1 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        # Assert
        assert res1.status_code == status.HTTP_200_OK
        assert len(res1.data) == 1

        # 2. Broader Range
        # Act
        res2 = sut_client.get(f"{sut_url}?start_month=1&start_year=2024&end_month=12&end_year=2024")
        # Assert
        assert res2.status_code == status.HTTP_200_OK
        assert len(res2.data) >= 1

        # 3. Invalid Range
        # Act
        res3 = sut_client.get(f"{sut_url}?start_month=1&start_year=2025&end_month=12&end_year=2025")
        # Assert
        assert res3.status_code == status.HTTP_200_OK
        assert len(res3.data) == 0

        # 4. Incomplete Parameters
        # Act
        res4 = sut_client.get(f"{sut_url}?start_year=2024&end_month=3&end_year=2024")
        # Assert
        assert res4.status_code == status.HTTP_200_OK
        assert len(res4.data) >= 1

        # 5. Range with Branch filter
        # Act
        res5 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res5.status_code == status.HTTP_200_OK
        assert len(res5.data) == 1
        assert float(res5.data[0]['net_profit_before_tax']) == 1500.0

    def test_financial_trend(self, api_client, financial_summary_env):
        """Test financial trend API fields and aggregated values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/financial_trend/?start_month=3&start_year=2024&end_month=3&end_year=2024"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert isinstance(sut_response.data, list)
        assert len(sut_response.data) > 0
        item = sut_response.data[0]
        expected_fields = [
            'month', 'year', 'total_revenue', 'total_expenses', 
            'net_profit_before_tax', 'gross_profit'
        ]
        for field in expected_fields:
            assert field in item, f"Field '{field}' missing from financial trend"

        assert int(item['month']) == 3
        assert int(item['year']) == 2024
        assert float(item['total_revenue']) == 20000.0
        assert float(item['total_expenses']) == 6000.0
        assert float(item['gross_profit']) == 12000.0
        assert float(item['net_profit_before_tax']) == 6000.0

    def test_financial_trend_filter(self, api_client, financial_summary_env):
        """Test financial trend filtering with various date combinations and expected precise values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/financial_trend/"
        expected_fields = ['month', 'year', 'total_revenue', 'total_expenses', 'net_profit_before_tax', 'gross_profit']

        # 1. Full Match
        # Act
        res1 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        # Assert
        assert res1.status_code == status.HTTP_200_OK
        assert len(res1.data) == 1
        item1 = res1.data[0]
        for field in expected_fields:
            assert field in item1
        assert float(item1['total_revenue']) == 20000.0
        assert float(item1['gross_profit']) == 12000.0
        assert float(item1['total_expenses']) == 6000.0
        assert float(item1['net_profit_before_tax']) == 6000.0

        # 2. Branch A1 Specific
        # Act
        res2 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res2.status_code == status.HTTP_200_OK
        assert len(res2.data) == 1
        item2 = res2.data[0]
        assert float(item2['total_revenue']) == 5000.0
        assert float(item2['gross_profit']) == 3000.0
        assert float(item2['total_expenses']) == 1500.0
        assert float(item2['net_profit_before_tax']) == 1500.0

        # 3. Future Range
        # Act
        res3 = sut_client.get(f"{sut_url}?start_month=1&start_year=2025&end_month=12&end_year=2025")
        # Assert
        assert res3.status_code == status.HTTP_200_OK
        assert len(res3.data) == 0

        # 4. Incomplete Parameters
        # Act
        res4 = sut_client.get(f"{sut_url}?start_year=2024&end_year=2024")
        # Assert
        assert res4.status_code == status.HTTP_200_OK
        assert len(res4.data) >= 1
        assert 'total_revenue' in res4.data[0]

    def test_tax_analytics(self, api_client, financial_summary_env):
        """Test tax analytics fields and aggregated values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/tax_analytics/?start_month=3&start_year=2024&end_month=3&end_year=2024"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert isinstance(sut_response.data, list)
        assert len(sut_response.data) > 0
        item = sut_response.data[0]
        expected_fields = ['month', 'year', 'input_gst', 'output_gst', 'gst_payable']
        for field in expected_fields:
            assert field in item, f"Field '{field}' missing from tax analytics"
        assert int(item['month']) == 3
        assert int(item['year']) == 2024
        assert float(item['input_gst']) == 800.0
        assert float(item['output_gst']) == 2000.0
        assert float(item['gst_payable']) == 1200.0

    def test_tax_analytics_filter(self, api_client, financial_summary_env):
        """Test tax analytics filtering with various date range and branch combinations."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/tax_analytics/"
        expected_fields = ['month', 'year', 'input_gst', 'output_gst', 'gst_payable']

        # 1. Full Match
        # Act
        res1 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        # Assert
        assert res1.status_code == status.HTTP_200_OK
        assert len(res1.data) == 1
        item1 = res1.data[0]
        for field in expected_fields:
            assert field in item1
        assert float(item1['input_gst']) == 800.0
        assert float(item1['output_gst']) == 2000.0

        # 2. Branch A1 Specific
        # Act
        res2 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res2.status_code == status.HTTP_200_OK
        assert len(res2.data) == 1
        item2 = res2.data[0]
        for field in expected_fields:
            assert field in item2
        assert float(item2['input_gst']) == 200.0
        assert float(item2['output_gst']) == 500.0

    def test_profit_margins(self, api_client, financial_summary_env):
        """Test profit margin API fields and aggregated values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/profit_margins/?start_month=3&start_year=2024&end_month=3&end_year=2024"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert isinstance(sut_response.data, list)
        assert len(sut_response.data) > 0
        item = sut_response.data[0]
        expected_fields = ['month', 'year', 'total_revenue', 'net_profit_before_tax', 'net_profit_margin', 'gross_profit_margin']
        for field in expected_fields:
            assert field in item, f"Field '{field}' missing from profit margins"
        assert int(item['month']) == 3
        assert int(item['year']) == 2024
        assert float(item['total_revenue']) == 20000.0
        assert float(item['net_profit_before_tax']) == 6000.0
        assert float(item['net_profit_margin']) == 30.0
        assert float(item['gross_profit_margin']) == 60.0

    def test_profit_margins_filter(self, api_client, financial_summary_env):
        """Test profit margin filtering with various date range and branch combinations."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=financial_summary_env.owner_a)
        sut_url = "/analytics/month/profit_margins/"
        expected_fields = ['month', 'year', 'total_revenue', 'net_profit_before_tax', 'net_profit_margin', 'gross_profit_margin']

        # 1. Full Match
        # Act
        res1 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024")
        # Assert
        assert res1.status_code == status.HTTP_200_OK
        assert len(res1.data) == 1
        item1 = res1.data[0]
        for field in expected_fields:
            assert field in item1
        assert float(item1['total_revenue']) == 20000.0
        assert float(item1['net_profit_margin']) == 30.0

        # 2. Broader Range
        # Act
        res2 = sut_client.get(f"{sut_url}?start_month=1&start_year=2024&end_month=12&end_year=2024")
        # Assert
        assert res2.status_code == status.HTTP_200_OK
        assert len(res2.data) >= 1

        # 3. Branch A1 Specific
        # Act
        res3 = sut_client.get(f"{sut_url}?start_month=3&start_year=2024&end_month=3&end_year=2024&branch={financial_summary_env.branch_a1.id}")
        # Assert
        assert res3.status_code == status.HTTP_200_OK
        assert len(res3.data) == 1
        item3 = res3.data[0]
        for field in expected_fields:
            assert field in item3
        assert float(item3['total_revenue']) == 5000.0
        assert float(item3['net_profit_margin']) == 30.0
        assert float(item3['gross_profit_margin']) == 60.0

        # 4. Future Range
        # Act
        res4 = sut_client.get(f"{sut_url}?start_month=1&start_year=2025&end_month=12&end_year=2025")
        # Assert
        assert res4.status_code == status.HTTP_200_OK
        assert len(res4.data) == 0

        # 5. Incomplete Parameters
        # Act
        res5 = sut_client.get(f"{sut_url}?start_year=2024&end_year=2024")
        # Assert
        assert res5.status_code == status.HTTP_200_OK
        assert len(res5.data) >= 1
        item5 = res5.data[0]
        for field in expected_fields:
            assert field in item5