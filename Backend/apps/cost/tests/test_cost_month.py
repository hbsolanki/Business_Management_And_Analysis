import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.list_url = reverse('cost-list')
    return tc


@pytest.mark.django_db
class TestCostMonth:

    def test_cost_month_read_by_owner(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        data = sut_response.data.get('results', sut_response.data)
        assert len(data) == 3

        summary = env.summary_branch_a1
        expected_item = next((item for item in data if item["id"] == summary.id), None)
        assert expected_item is not None

        assert expected_item["year"] == summary.year
        assert expected_item["month"] == summary.month
        assert expected_item["branch"] == summary.branch.id
        assert str(expected_item["total_revenue"]) == str(summary.total_revenue)
        assert str(expected_item["cost_of_goods_sold"]) == str(summary.cost_of_goods_sold)
        assert str(expected_item["total_expenses"]) == str(summary.total_expenses)
        assert str(expected_item["gross_profit"]) == str(summary.gross_profit)
        assert str(expected_item["net_profit_before_tax"]) == str(summary.net_profit_before_tax)
        assert str(expected_item["operating_expenses"]) == str(summary.operating_expenses)
        assert str(expected_item["salary_expenses"]) == str(summary.salary_expenses)
        assert str(expected_item["input_gst"]) == str(summary.input_gst)
        assert str(expected_item["output_gst"]) == str(summary.output_gst)
        assert str(expected_item["gst_payable"]) == str(summary.gst_payable)
        assert expected_item["invoice_count"] == summary.invoice_count
        assert "cost_category_items" in expected_item

        if summary.product_performance.exists():
            perf = summary.product_performance.first()
            perf_data = expected_item["product_performance"][0]
            assert perf_data["id"] == perf.id
            assert perf_data["product_name"] == (perf.product.name if perf.product else None)
            assert perf_data["product_sku"] == (perf.product.sku if perf.product else None)
            assert str(perf_data["cost"]) == str(perf.cost)
            assert perf_data["product_category_name"] == (perf.product.category.name if perf.product and perf.product.category else None)
            assert str(perf_data["revenue"]) == str(perf.revenue)
            assert perf_data["product_id"] == (perf.product.id if perf.product else None)
            assert perf_data["quantity"] == perf.quantity

    def test_cost_month_read_by_manager_assigned_branch(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.manager_a1)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        data = sut_response.data.get('results', sut_response.data)
        assert len(data) == 1
        assert data[0]['id'] == env.summary_branch_a1.id

    def test_cost_month_read_by_manager_unassigned_branch(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.manager_a1)

        # Act
        sut_response = api_client.get(sut_url, {"branch": env.branch_a2.id})

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        data = sut_response.data.get('results', sut_response.data)
        assert len(data) == 0

    def test_cost_month_read_by_employee_assigned_branch(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.employee_a1)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cost_month_read_by_employee_unassigned_branch(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.employee_a1)

        # Act
        sut_response = api_client.get(sut_url, {"branch": env.branch_a2.id})

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cost_month_read_by_owner_other_business(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_b)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        data = sut_response.data.get('results', sut_response.data)
        assert len(data) == 3

    def test_cost_month_read_by_manager_other_business(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.manager_b1)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        data = sut_response.data.get('results', sut_response.data)
        assert len(data) == 1
        assert data[0]['id'] == env.summary_branch_b1.id

    def test_cost_month_read_by_employee_other_business(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.employee_b1)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN
