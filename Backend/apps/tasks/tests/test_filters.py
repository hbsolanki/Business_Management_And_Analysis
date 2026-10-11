import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.tasks.models import Task, TaskAssignment, TaskGroup, TaskGroupMember
from datetime import timedelta
from urllib.parse import urlencode
from unittest.mock import patch
from apps.activity_log.models import ActivityLog

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
class TestTaskFilters:

    def test_task_crud_by_assigned_by(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        
        data = {
            "title": "Test Task",
            "description": "Test Description",
            "task_assignment": {"assignee_id": env.employee_a1.id},
            "status": Task.Status.PENDING
        }
        
        # Act - Create
        sut_response_create = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response_create.status_code == status.HTTP_201_CREATED
        task_id = sut_response_create.data['id']
        env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.TASKS)
        
        # Arrange
        sut_detail_url = reverse('tasks-detail', args=[task_id])
        
        # Act - Read
        sut_response_read = api_client.get(sut_detail_url)
        
        # Assert
        assert sut_response_read.status_code == status.HTTP_200_OK
        
        # Act - Update
        sut_response_update = api_client.patch(sut_detail_url, {"title": "Updated Title"}, format='json')
        
        # Assert
        assert sut_response_update.status_code == status.HTTP_200_OK
        assert Task.objects.get(id=task_id).title == "Updated Title"
        log = env._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.TASKS)
        assert log.meta['title']['old'] == "Test Task"
        
        # Act - Delete
        sut_response_delete = api_client.delete(sut_detail_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task_id).exists()
        env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.TASKS)

    def test_task_filtering_combinations(self, api_client, env):
        """Test task filters."""
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        
        Task.objects.filter(id=env.task_a1.id).update(
            title="Today Task",
            created_at=timezone.now()
        )
        Task.objects.filter(id=env.task_a2.id).update(
            title="Yesterday Task",
            assigned_by=env.owner_a,
            created_at=timezone.now() - timedelta(days=1)
        )

        # Act - 1. Title partial
        sut_response_title = api_client.get(f"{sut_url}?title=Today")
        
        # Assert
        assert len(sut_response_title.data["results"]) == 1
        assert sut_response_title.data["results"][0]["title"] == "Today Task"

        # Act - 3. Assignee exact
        sut_response_assignee = api_client.get(f"{sut_url}?assignee={env.employee_a1.id}")
        
        # Assert
        assert len(sut_response_assignee.data["results"]) == 1
        assert sut_response_assignee.data["results"][0]["assignee"]["id"] == env.employee_a1.id

        # Act - 4. Assigned by exact
        sut_response_assigned_by = api_client.get(f"{sut_url}?assigned_by={env.owner_a.id}")
        
        # Assert
        assert len(sut_response_assigned_by.data["results"]) == 2
        assert sut_response_assigned_by.data["results"][0]["assigned_by"]["id"] == env.owner_a.id
        assert sut_response_assigned_by.data["results"][1]["assigned_by"]["id"] == env.owner_a.id

        # Act - 5. From date
        from_date = (timezone.localdate() - timedelta(days=1)).isoformat()
        sut_response_from_date = api_client.get(f"{sut_url}?from_date={from_date}")
        
        # Assert
        assert len(sut_response_from_date.data["results"]) == 2
        assert sut_response_from_date.data["results"][0]["created_at"][:10] >= from_date
        assert sut_response_from_date.data["results"][1]["created_at"][:10] >= from_date

        # Act - 6. To date
        to_date = (timezone.localdate() - timedelta(days=1)).isoformat()
        sut_response_to_date = api_client.get(f"{sut_url}?to_date={to_date}")
        
        # Assert
        assert len(sut_response_to_date.data["results"]) == 1
        assert sut_response_to_date.data["results"][0]["created_at"][:10] == to_date

        # Act - 7. Title + Assignee
        sut_response_title_assignee = api_client.get(f"{sut_url}?title=Today&assignee={env.employee_a1.id}")
        
        # Assert
        assert len(sut_response_title_assignee.data["results"]) == 1
        assert sut_response_title_assignee.data["results"][0]["title"] == "Today Task"
        assert sut_response_title_assignee.data["results"][0]["assignee"]["id"] == env.employee_a1.id

        # Act - 8. Date range + Assignee
        sut_response_date_assignee = api_client.get(f"{sut_url}?from_date={from_date}&to_date={to_date}&assignee={env.employee_a2.id}")
        
        # Assert
        assert len(sut_response_date_assignee.data["results"]) == 1
        assert sut_response_date_assignee.data["results"][0]["created_at"][:10] == to_date
        assert sut_response_date_assignee.data["results"][0]["assignee"]["id"] == env.employee_a2.id
    
    def test_task_deadline_filtering(self, api_client, env):
        """Test task filtering by from_deadline, to_deadline, and overdue status."""
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        
        Task.objects.all().delete()
        
        task_overdue = Task.objects.create(
            business=env.business_a,
            assigned_by=env.owner_a,
            title="Overdue Task",
            description="D1",
            deadline=timezone.now() - timedelta(days=1),
            status=Task.Status.PENDING
        )
        TaskAssignment.objects.create(task=task_overdue, assignee=env.employee_a1)

        task_upcoming = Task.objects.create(
            business=env.business_a,
            assigned_by=env.owner_a,
            title="Upcoming Task",
            description="D2",
            deadline=timezone.now() + timedelta(days=1),
            status=Task.Status.PENDING
        )
        TaskAssignment.objects.create(task=task_upcoming, assignee=env.employee_a1)

        task_completed_yesterday = Task.objects.create(
            business=env.business_a,
            assigned_by=env.owner_a,
            title="Completed Task",
            description="D3",
            deadline=timezone.now() - timedelta(days=1),
            status=Task.Status.COMPLETED
        )
        TaskAssignment.objects.create(task=task_completed_yesterday, assignee=env.employee_a1)

        from_deadline = (timezone.now() + timedelta(hours=12)).isoformat()
        to_deadline = (timezone.now() + timedelta(days=2)).isoformat()
        qs = urlencode({"from_deadline": from_deadline, "to_deadline": to_deadline})
        
        # Act
        sut_response = api_client.get(f"{sut_url}?{qs}")
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {t["id"] for t in sut_response.data["results"]}
        assert task_upcoming.id in returned_ids
        assert task_overdue.id not in returned_ids

    def test_task_reassignment_notification(self, api_client, env):
        """Reassigning a task sends notification to new assignee."""
        # Arrange
        sut_url = reverse('tasks-detail', args=[env.task_a1.id])
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        with patch('apps.tasks.views.send_task_assigned_notification') as mock_notify:
            sut_response = api_client.patch(sut_url, {"task_assignment": {"assignee_id": env.employee_a2.id}}, format='json')
            
            # Assert
            assert sut_response.status_code == status.HTTP_200_OK
            
            env.task_a1.refresh_from_db()
            assignment = env.task_a1.assignments.filter(assignee_type__model='user').first()
            assert assignment.assignee_id == env.employee_a2.id
            mock_notify.assert_called_once()
            args, kwargs = mock_notify.call_args
            assert args[0].id == env.task_a1.id

    def test_task_filtering_by_taskgroup(self, api_client, env):
        """Test filtering tasks by taskgroup ID."""
        # Arrange
        sut_url = env.task_list_url
        api_client.force_authenticate(user=env.owner_a)
        
        group = TaskGroup.objects.create(name="Charlie Team", business=env.business_a, created_by=env.owner_a)
        TaskGroupMember.objects.create(group=group, user=env.employee_a1)
        
        data = {
            "title": "Group Filter Task",
            "description": "Desc",
            "task_assignment": {"assignee_group_id": group.id}
        }
        api_client.post(sut_url, data, format='json')
        
        # Act
        sut_response = api_client.get(f"{sut_url}?taskgroup={group.id}")
        
        # Assert
        assert len(sut_response.data["results"]) == 1
        assert sut_response.data["results"][0]["title"] == "Group Filter Task"
