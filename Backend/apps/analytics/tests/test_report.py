import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def report_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment(has_advanced_analytics=True)
    return tc


@pytest.mark.django_db
class TestReportPytest:

    def test_permission(self, api_client, report_env):
        """Check report permissions."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=report_env.owner_a)
        sut_url = "/analytics/report/generate/"
        sut_payload = {"start_date": "2024-03-01", "end_date": "2024-03-31"}

        # Act
        sut_res_owner = sut_client.post(sut_url, sut_payload)

        # Assert
        assert sut_res_owner.status_code == 202

        # Arrange (Employee)
        sut_client.force_authenticate(user=report_env.employee_a1)

        # Act
        sut_res_emp = sut_client.post(sut_url, sut_payload)

        # Assert
        assert sut_res_emp.status_code == 202

    @patch('apps.analytics.tasks.send_analytics_report_email.delay')
    def test_report_generate(self, mock_task, api_client, report_env):
        """Verify report generation."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=report_env.owner_a)
        sut_url = "/analytics/report/generate/"
        sut_payload = {
            "report_type": ["product", "cost"],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }

        # Act
        sut_res = sut_client.post(sut_url, sut_payload)

        # Assert
        assert sut_res.status_code == 202
        assert sut_res.data['detail'] == "Analytics report is being generated and will be sent to your email."
        assert ActivityLog.objects.filter(module="ANALYTICS").exists()
        assert mock_task.called

    @patch('apps.analytics.tasks.send_analytics_report_email.delay')
    def test_report_generate_filter(self, mock_task, api_client, report_env):
        """Filter report generation."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=report_env.owner_a)
        sut_url = "/analytics/report/generate/"

        # 1. Branch filter
        # Arrange
        payload1 = {
            "branch_ids": [report_env.branch_a1.id],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        # Act
        res1 = sut_client.post(sut_url, payload1)
        # Assert
        assert res1.status_code == 202

        # 2. Product filter
        # Arrange
        payload2 = {
            "product_ids": [report_env.product_a1.id],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        # Act
        res2 = sut_client.post(sut_url, payload2)
        # Assert
        assert res2.status_code == 202

        # 3. Specific type
        # Arrange
        payload3 = {
            "report_type": ["inventory"],
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
        # Act
        res3 = sut_client.post(sut_url, payload3)
        # Assert
        assert res3.status_code == 202

        # 4. Filter mismatch
        # Arrange
        payload4 = {
            "branch_ids": [999],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        # Act
        res4 = sut_client.post(sut_url, payload4)
        # Assert
        assert res4.status_code == 202

        # 5. Invalid date
        # Arrange
        payload5 = {
            "start_date": "invalid",
            "end_date": "2024-03-31"
        }
        # Act
        res5 = sut_client.post(sut_url, payload5)
        # Assert
        assert res5.status_code == 400
