import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def activity_log_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.url_logs = reverse('activity-log-list')
    return tc


@pytest.mark.django_db
class TestActivityLog:

    def test_activity_log_read_by_owner(self, api_client, activity_log_env):
        # Arrange
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a1, message="Log A1")
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a2, message="Log A2")
        api_client.force_authenticate(user=activity_log_env.owner_a)
        sut_url = activity_log_env.url_logs

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        logs = [log_item['message'] for log_item in sut_response.data['results']]
        assert "Log A1" in logs
        assert "Log A2" in logs

    def test_activity_log_read_by_manager_on_assigned_branch(self, api_client, activity_log_env):
        # Arrange
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a1, message="Log A1")
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a2, message="Log A2")
        api_client.force_authenticate(user=activity_log_env.manager_a1)
        sut_url = activity_log_env.url_logs

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        messages = [log_item['message'] for log_item in sut_response.data['results']]
        assert "Log A1" in messages
        assert "Log A2" not in messages

    def test_activity_log_read_by_manager_on_unassigned_branch(self, api_client, activity_log_env):
        # Arrange
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a2, message="Log A2")
        api_client.force_authenticate(user=activity_log_env.manager_a1)
        sut_url = f"{activity_log_env.url_logs}?branch={activity_log_env.branch_a2.id}"

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert len(sut_response.data['results']) == 0

    def test_activity_log_read_by_employee(self, api_client, activity_log_env):
        # Arrange
        api_client.force_authenticate(user=activity_log_env.employee_a1)
        sut_url = activity_log_env.url_logs

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_activity_log_read_by_owner_other_business(self, api_client, activity_log_env):
        # Arrange
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a1, message="Business A Log")
        api_client.force_authenticate(user=activity_log_env.owner_b)
        sut_url = activity_log_env.url_logs

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        messages = [log_item['message'] for log_item in sut_response.data['results']]
        assert "Business A Log" not in messages

    def test_activity_log_read_by_manager_on_assigned_branch_other_business(self, api_client, activity_log_env):
        # Arrange
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a1, message="Secret A")
        api_client.force_authenticate(user=activity_log_env.manager_b1)
        sut_url = activity_log_env.url_logs

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        messages = [log_item['message'] for log_item in sut_response.data['results']]
        assert "Secret A" not in messages

    def test_activity_log_read_by_manager_on_unassigned_branch_other_business(self, api_client, activity_log_env):
        # Arrange
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CUSTOM, ActivityLog.Module.OTHER, activity_log_env.branch_a2, message="Secret A2")
        api_client.force_authenticate(user=activity_log_env.manager_b1)
        sut_url = f"{activity_log_env.url_logs}?branch={activity_log_env.branch_a2.id}"

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert len(sut_response.data['results']) == 0

    def test_activity_log_read_by_employee_other_business(self, api_client, activity_log_env):
        # Arrange
        api_client.force_authenticate(user=activity_log_env.employee_b1)
        sut_url = activity_log_env.url_logs

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_activity_log_filtering_combinations(self, api_client, activity_log_env):
        # Arrange
        api_client.force_authenticate(user=activity_log_env.owner_a)
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE, activity_log_env.branch_a1, message="l1")
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.UPDATE, ActivityLog.Module.PRODUCT, activity_log_env.branch_a1, message="l2")
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.manager_a1, ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE, activity_log_env.branch_a1, message="l3")
        ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE, activity_log_env.branch_a2, message="l4")
        sut_url = activity_log_env.url_logs

        # Act & Assert - 1. Actor filter
        res1 = api_client.get(f"{sut_url}?actor={activity_log_env.manager_a1.id}")
        assert len(res1.data["results"]) == 1
        assert res1.data["results"][0]["actor"] == activity_log_env.manager_a1.id

        # Act & Assert - 2. Module filter
        res2 = api_client.get(f"{sut_url}?module={ActivityLog.Module.PRODUCT}")
        assert len(res2.data["results"]) == 1
        assert res2.data["results"][0]["module"] == ActivityLog.Module.PRODUCT

        # Act & Assert - 3. Action filter
        res3 = api_client.get(f"{sut_url}?action={ActivityLog.Action.UPDATE}")
        assert len(res3.data["results"]) == 1
        assert res3.data["results"][0]["action"] == ActivityLog.Action.UPDATE

        # Act & Assert - 4. Branch filter
        res4 = api_client.get(f"{sut_url}?branch={activity_log_env.branch_a2.id}")
        assert len(res4.data["results"]) == 1
        assert res4.data["results"][0]["branch"] == activity_log_env.branch_a2.id

        # Act & Assert - 5. Actor + Module
        res5 = api_client.get(f"{sut_url}?actor={activity_log_env.owner_a.id}&module={ActivityLog.Module.INVOICE}")
        assert len(res5.data["results"]) == 2
        assert res5.data["results"][0]["actor"] == activity_log_env.owner_a.id
        assert res5.data["results"][0]["module"] == ActivityLog.Module.INVOICE

        # Act & Assert - 6. Actor + Action
        res6 = api_client.get(f"{sut_url}?actor={activity_log_env.owner_a.id}&action={ActivityLog.Action.CREATE}")
        assert len(res6.data["results"]) == 2
        assert res6.data["results"][0]["actor"] == activity_log_env.owner_a.id
        assert res6.data["results"][0]["action"] == ActivityLog.Action.CREATE

        # Act & Assert - 7. Module + Action
        res7 = api_client.get(f"{sut_url}?module={ActivityLog.Module.INVOICE}&action={ActivityLog.Action.CREATE}")
        assert len(res7.data["results"]) == 3

        # Act & Assert - 8. Branch + Module
        res8 = api_client.get(f"{sut_url}?branch={activity_log_env.branch_a1.id}&module={ActivityLog.Module.PRODUCT}")
        assert len(res8.data["results"]) == 1
        assert res8.data["results"][0]["branch"] == activity_log_env.branch_a1.id
        assert res8.data["results"][0]["module"] == ActivityLog.Module.PRODUCT

        # Act & Assert - 9. Branch + Action
        res9 = api_client.get(f"{sut_url}?branch={activity_log_env.branch_a1.id}&action={ActivityLog.Action.CREATE}")
        assert len(res9.data["results"]) == 2

        # Act & Assert - 10. All filters
        res10 = api_client.get(
            f"{sut_url}?actor={activity_log_env.owner_a.id}&module={ActivityLog.Module.INVOICE}&action={ActivityLog.Action.CREATE}&branch={activity_log_env.branch_a1.id}"
        )
        assert len(res10.data["results"]) == 1
        assert res10.data["results"][0]["message"] == "l1"

        # Act & Assert - 11. Non-existent actor
        res11 = api_client.get(f"{sut_url}?actor=99999")
        assert len(res11.data["results"]) == 0

        # Act & Assert - 12. Non-existent branch
        res12 = api_client.get(f"{sut_url}?branch=99999")
        assert len(res12.data["results"]) == 0

    def test_activity_log_pagination(self, api_client, activity_log_env):
        # Arrange
        api_client.force_authenticate(user=activity_log_env.owner_a)
        for i in range(7):
            ActivityLog.objects.log(activity_log_env.business_a, activity_log_env.owner_a, ActivityLog.Action.CREATE, ActivityLog.Module.OTHER, activity_log_env.branch_a1, message=f"extra {i}")
        sut_url = activity_log_env.url_logs

        # Act - Page 1 (size 6)
        sut_page1_res = api_client.get(sut_url)

        # Assert - Page 1
        assert len(sut_page1_res.data["results"]) == 6

        # Act - Page 2
        sut_page2_res = api_client.get(sut_page1_res.data["next"])

        # Assert - Page 2
        assert len(sut_page2_res.data["results"]) >= 1
