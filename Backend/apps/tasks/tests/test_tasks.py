import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.tasks.models import Task, TaskAssignment
from datetime import timedelta
from apps.notification.models import Reminder

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass
    
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    
    tc.task_list_url = reverse('tasks-list')
    tc.task_a1 = Task.objects.create(
        business=tc.business_a,
        branch=tc.branch_a1,
        assigned_by=tc.owner_a,
        title="Task A1",
        description="Desc A1"
    )
    TaskAssignment.objects.create(task=tc.task_a1, assignee=tc.employee_a1)
    
    tc.task_a2 = Task.objects.create(
        business=tc.business_a,
        branch=tc.branch_a2,
        assigned_by=tc.manager_a1,
        title="Task A2",
        description="Desc A2"
    )
    TaskAssignment.objects.create(task=tc.task_a2, assignee=tc.employee_a2)
    
    return tc

@pytest.mark.django_db
class TestTasks:

    def test_task_crud_by_assignee(self, api_client, env):
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id])
        api_client.force_authenticate(user=env.employee_a1)

        # Act
        sut_response_read = api_client.get(sut_url)
        
        # Assert - Read successful
        assert sut_response_read.status_code == status.HTTP_200_OK

        # Act
        sut_response_update = api_client.patch(sut_url, {"status": Task.Status.COMPLETED}, format='json')
        
        # Assert - Update status successful
        assert sut_response_update.status_code == status.HTTP_200_OK
        env.task_a1.refresh_from_db()
        assert env.task_a1.status == Task.Status.COMPLETED

        # Act
        sut_response_delete = api_client.delete(sut_url)
        
        # Assert - Delete forbidden
        assert sut_response_delete.status_code == status.HTTP_403_FORBIDDEN

    def test_task_read_update_delete_by_third_user(self, api_client, env):
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id])
        api_client.force_authenticate(user=env.manager_a1)
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert - Third user blocked
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_task_crud_by_diffrent_business_user(self, api_client, env):
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id])
        api_client.force_authenticate(user=env.owner_b)

        # Act - Read
        sut_response_read = api_client.get(sut_url)
        
        # Assert - Read blocked
        assert sut_response_read.status_code == status.HTTP_404_NOT_FOUND

        # Arrange - Create payload
        data = {"title": "B Task", "description": "Work", "task_assignment": {"assignee_id": env.employee_a1.id}}
        
        # Act - Create
        sut_response_create = api_client.post(env.task_list_url, data, format='json')
        
        # Assert - Create blocked
        assert sut_response_create.status_code == status.HTTP_400_BAD_REQUEST

    def test_task_create_without_title(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {
            "description": "Test Description",
            "task_assignment": {"assignee_id": env.employee_a1.id}
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'title' in sut_response.data

    def test_task_create_without_status(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {
            "title": "Test Title",
            "description": "Test Description",
            "task_assignment": {"assignee_id": env.employee_a1.id}
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert sut_response.data['status'] == Task.Status.PENDING

    def test_task_create_without_description(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {
            "title": "Test Title",
            "task_assignment": {"assignee_id": env.employee_a1.id}
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'description' in sut_response.data

    def test_task_create_without_remark(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {
            "title": "Test Title",
            "description": "Test Description",
            "task_assignment": {"assignee_id": env.employee_a1.id}
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED

    def test_task_list_access_permissions(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        
        t1 = Task.objects.create(business=env.business_a, branch=env.branch_a1, assigned_by=env.owner_a, title="Task 1", description="D1")
        TaskAssignment.objects.create(task=t1, assignee=env.employee_a1)
        
        t2 = Task.objects.create(business=env.business_a, branch=env.branch_a2, assigned_by=env.owner_a, title="Task 2", description="D2")
        TaskAssignment.objects.create(task=t2, assignee=env.employee_a2)
        
        t3 = Task.objects.create(business=env.business_a, branch=env.branch_a1, assigned_by=env.owner_a, title="Task 3", description="D3")
        TaskAssignment.objects.create(task=t3, assignee=env.owner_a)

        # Act - Owner fetch
        api_client.force_authenticate(user=env.owner_a)
        sut_response_owner = api_client.get(sut_url)
        
        # Assert - Owner sees own (task_a1 + task1 + task2 + task3 = 4)
        assert sut_response_owner.status_code == status.HTTP_200_OK
        assert len(sut_response_owner.data['results']) == 4

        # Act - Employee 1 fetch
        api_client.force_authenticate(user=env.employee_a1)
        sut_response_emp1 = api_client.get(sut_url)
        
        # Assert - Employee 1 sees own only
        assert len(sut_response_emp1.data['results']) == 2

        # Act - Employee 2 fetch
        api_client.force_authenticate(user=env.employee_a2)
        sut_response_emp2 = api_client.get(sut_url)
        
        # Assert - Employee 2 sees own only
        assert len(sut_response_emp2.data['results']) == 2

    def test_task_pagination(self, api_client, env):
        """Test task pagination."""
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        # Seed 15 tasks
        for i in range(15):
            t = Task.objects.create(
                business=env.business_a,
                branch=env.branch_a1,
                assigned_by=env.owner_a,
                title=f"Bulk Task {i}",
                description="D"
            )
            TaskAssignment.objects.create(task=t, assignee=env.employee_a1)

        # Act - Page 1
        sut_response_page1 = api_client.get(sut_url)
        
        # Assert - Page 1 size
        assert len(sut_response_page1.data["results"]) == 6
        
        # Act - Page 2
        sut_response_page2 = api_client.get(sut_response_page1.data["next"])
        
        # Assert - Page 2 size
        assert len(sut_response_page2.data["results"]) == 6

    def test_task_deadline_authorization(self, api_client, env):
        """Test that only assigned_by (creator) can modify the deadline."""
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id])
        deadline_time = timezone.now() + timezone.timedelta(days=2)

        # Act - 1. As Assigner (owner_a), setting the deadline should succeed
        api_client.force_authenticate(user=env.owner_a)
        sut_response_owner = api_client.patch(sut_url, {"deadline": deadline_time.isoformat()}, format='json')
        
        # Assert
        assert sut_response_owner.status_code == status.HTTP_200_OK
        env.task_a1.refresh_from_db()
        assert env.task_a1.deadline is not None

        # Act - 2. As Assignee (employee_a1), changing the deadline should fail
        api_client.force_authenticate(user=env.employee_a1)
        new_deadline_time = timezone.now() + timezone.timedelta(days=5)
        sut_response_assignee_fail = api_client.patch(sut_url, {"deadline": new_deadline_time.isoformat()}, format='json')
        
        # Assert
        assert sut_response_assignee_fail.status_code == status.HTTP_400_BAD_REQUEST
        assert "deadline" in sut_response_assignee_fail.data

        # Act - 3. As Assignee, updating other fields (like status) without changing deadline should succeed
        sut_response_assignee_success = api_client.patch(sut_url, {
            "status": Task.Status.IN_PROGRESS,
            "deadline": env.task_a1.deadline.isoformat()
        }, format='json')
        
        # Assert
        assert sut_response_assignee_success.status_code == status.HTTP_200_OK
        env.task_a1.refresh_from_db()
        assert env.task_a1.status == Task.Status.IN_PROGRESS

    def test_task_create_custom_reminder_action(self, api_client, env):
        """Test the custom action /api/tasks/{id}/create-reminder/ to create decoupled reminders."""
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id]) + "create-reminder/"
        api_client.force_authenticate(user=env.owner_a)
        
        # Act - 1. Verify invalid payload is rejected
        sut_response_invalid = api_client.post(sut_url, {})
        
        # Assert
        assert sut_response_invalid.status_code == status.HTTP_400_BAD_REQUEST
        
        # Arrange - Valid payload
        future_time = timezone.now() + timedelta(days=1)
        data = {
            "title": "Custom Task Alert",
            "content": "Check project milestones",
            "remind_at": future_time.isoformat()
        }
        
        # Act - 2. Verify creating a custom reminder with valid data
        sut_response_valid = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response_valid.status_code == status.HTTP_201_CREATED
        
        # Assert - Verify the created general reminder in DB
        reminder_id = sut_response_valid.data['id']
        reminder = Reminder.objects.get(id=reminder_id)
        assert reminder.title == "Custom Task Alert"
        assert "Check project milestones" in reminder.content
        assert reminder.user == env.owner_a
        assert reminder.celery_task_id is not None

    def test_cannot_assign_inactive_user(self, api_client, env):
        """Soft-deleted/Inactive user assignment is blocked."""
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        env.employee_a1.is_active = False
        env.employee_a1.save(update_fields=["is_active"])

        data = {"title": "Task", "description": "Desc", "task_assignment": {"assignee_id": env.employee_a1.id}}
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "does not exist" in str(sut_response.data)

    def test_past_deadline_rejected(self, api_client, env):
        """Deadline in the past is rejected."""
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        past_time = timezone.now() - timezone.timedelta(days=1)
        data = {
            "title": "Task", "description": "Desc",
            "task_assignment": {"assignee_id": env.employee_a1.id},
            "deadline": past_time.isoformat()
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "future" in str(sut_response.data)

    def test_revert_completed_clears_timestamp(self, api_client, env):
        """completed_at becomes None if status reverts from COMPLETED."""
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id])
        api_client.force_authenticate(user=env.employee_a1)
        
        # Act - Mark Complete
        sut_response_complete = api_client.patch(sut_url, {"status": Task.Status.COMPLETED}, format='json')
        
        # Assert
        assert sut_response_complete.status_code == status.HTTP_200_OK
        env.task_a1.refresh_from_db()
        assert env.task_a1.completed_at is not None

        # Act - Revert to Pending
        sut_response_pending = api_client.patch(sut_url, {"status": Task.Status.PENDING}, format='json')
        
        # Assert
        assert sut_response_pending.status_code == status.HTTP_200_OK
        env.task_a1.refresh_from_db()
        assert env.task_a1.completed_at is None
