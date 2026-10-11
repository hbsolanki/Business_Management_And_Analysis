import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.tasks.models import Task, TaskAssignment, TaskGroup, TaskGroupMember

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
    
    # Task specific setup
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
class TestTaskGroups:
    
    def test_task_group_create_permissions(self, api_client, env):
        # Arrange
        sut_url = reverse('task-groups-list')
        owner = env.owner_a
        employee = env.employee_a1
        
        # Act & Assert - Owner can create
        api_client.force_authenticate(user=owner)
        owner_data = {"name": "Owners Group", "is_private": False}
        sut_response_owner = api_client.post(sut_url, owner_data, format='json')
        assert sut_response_owner.status_code == status.HTTP_201_CREATED
        
        # Act & Assert - Employee cannot create
        api_client.force_authenticate(user=employee)
        employee_data = {"name": "Employee Group"}
        sut_response_employee = api_client.post(sut_url, employee_data, format='json')
        assert sut_response_employee.status_code == status.HTTP_403_FORBIDDEN

    def test_task_group_visibility(self, api_client, env):
        # Arrange
        sut_url = reverse('task-groups-list')
        group1 = TaskGroup.objects.create(name="Public Group", business=env.business_a, created_by=env.owner_a, is_private=False)
        group2 = TaskGroup.objects.create(name="Private Group", business=env.business_a, created_by=env.owner_a, is_private=True)
        TaskGroupMember.objects.create(group=group2, user=env.employee_a2)

        # Act
        api_client.force_authenticate(user=env.owner_a)
        sut_response_owner = api_client.get(sut_url)
        
        # Assert - Owner sees all groups
        assert len(sut_response_owner.data["results"]) >= 2

        # Act
        api_client.force_authenticate(user=env.employee_a1)
        sut_response_emp1 = api_client.get(sut_url)
        
        # Assert - Employee 1 sees only public group
        assert len(sut_response_emp1.data["results"]) == 1
        assert sut_response_emp1.data["results"][0]["id"] == group1.id

        # Act
        api_client.force_authenticate(user=env.employee_a2)
        sut_response_emp2 = api_client.get(sut_url)
        
        # Assert - Employee 2 sees public group and their private group
        assert len(sut_response_emp2.data["results"]) == 2

    def test_create_task_with_group(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        group = TaskGroup.objects.create(name="Team Alpha", business=env.business_a, created_by=env.owner_a)
        TaskGroupMember.objects.create(group=group, user=env.employee_a1)
        TaskGroupMember.objects.create(group=group, user=env.employee_a2)
        
        data = {
            "title": "Group Task",
            "description": "Do this together",
            "task_assignment": {"assignee_group_id": group.id},
            "branch": env.branch_a1.id
        }

        # Act - Create task with group
        api_client.force_authenticate(user=env.owner_a)
        sut_response_create = api_client.post(sut_url, data, format='json')
        
        # Assert - Task created
        assert sut_response_create.status_code == status.HTTP_201_CREATED
        task_id = sut_response_create.data['id']
        
        # Act & Assert - Verify employee 1 visibility
        sut_detail_url = reverse('tasks-detail', args=[task_id])
        api_client.force_authenticate(user=env.employee_a1)
        sut_response_emp1 = api_client.get(sut_detail_url)
        assert sut_response_emp1.status_code == status.HTTP_200_OK

        # Act & Assert - Employee 2 is NOT in branch_a1, so they shouldn't see it
        api_client.force_authenticate(user=env.employee_a2)
        sut_response_emp2 = api_client.get(sut_detail_url)
        assert sut_response_emp2.status_code == status.HTTP_404_NOT_FOUND

    def test_task_constraint_either_assignee_or_group(self, api_client, env):
        # Arrange
        sut_url = env.task_list_url
        group = TaskGroup.objects.create(name="Team Beta", business=env.business_a, created_by=env.owner_a)
        api_client.force_authenticate(user=env.owner_a)
        
        data_both = {
            "title": "Invalid Task",
            "description": "Both provided",
            "task_assignment": {
                "assignee_id": env.employee_a1.id,
                "assignee_group_id": group.id
            }
        }
        
        data_none = {
            "title": "Invalid Task",
            "description": "None provided",
        }

        # Act
        sut_response_both = api_client.post(sut_url, data_both, format='json')
        
        # Assert - Provide both fails
        assert sut_response_both.status_code == status.HTTP_400_BAD_REQUEST
        
        # Act
        sut_response_none = api_client.post(sut_url, data_none, format='json')
        
        # Assert - Provide neither fails
        assert sut_response_none.status_code == status.HTTP_400_BAD_REQUEST

    def test_taskgroup_filtering_combinations(self, api_client, env):
        # Arrange
        sut_url = reverse('task-groups-list')
        api_client.force_authenticate(user=env.owner_a)
        
        g1 = TaskGroup.objects.create(name="Alpha Team", business=env.business_a, created_by=env.owner_a, is_private=False)
        TaskGroupMember.objects.create(group=g1, user=env.employee_a1) 
        
        g2 = TaskGroup.objects.create(name="Beta Squad", business=env.business_a, created_by=env.owner_a, is_private=True)
        TaskGroupMember.objects.create(group=g2, user=env.employee_a2)
        
        # Act
        sut_response_name = api_client.get(f"{sut_url}?name=Alpha")
        
        # Assert - Partial name filter
        assert len(sut_response_name.data["results"]) == 1
        assert sut_response_name.data["results"][0]["name"] == "Alpha Team"
        
        # Act
        sut_response_member = api_client.get(f"{sut_url}?member_id={env.employee_a2.id}")
        
        # Assert - Member ID filter
        assert len(sut_response_member.data["results"]) == 1
        assert sut_response_member.data["results"][0]["name"] == "Beta Squad"
        
        # Act
        sut_response_private = api_client.get(f"{sut_url}?is_private=true")
        
        # Assert - is_private filter
        assert len(sut_response_private.data["results"]) == 1
        assert sut_response_private.data["results"][0]["name"] == "Beta Squad"
        
        # Act
        sut_response_combo = api_client.get(f"{sut_url}?name=Beta&member_id={env.employee_a2.id}")
        
        # Assert - Combination: Name + Member ID
        assert len(sut_response_combo.data["results"]) == 1

    def test_taskgroup_update_and_member_management(self, api_client, env):
        # Arrange
        group = TaskGroup.objects.create(name="Delta Team", business=env.business_a, created_by=env.owner_a)
        TaskGroupMember.objects.create(group=group, user=env.employee_a1)
        sut_url = reverse('task-groups-detail', args=[group.id])
        
        # Act
        api_client.force_authenticate(user=env.employee_a1)
        sut_response_forbidden = api_client.patch(sut_url, {"name": "Hacked Team"}, format='json')
        
        # Assert - Non-owner cannot update
        assert sut_response_forbidden.status_code == status.HTTP_403_FORBIDDEN
        
        # Arrange for update
        api_client.force_authenticate(user=env.owner_a)
        update_data = {
            "name": "Delta Force",
            "members": [
                {"user_id": env.employee_a2.id}
            ]
        }
        
        # Act - Update name and members
        sut_response_update = api_client.patch(sut_url, update_data, format='json')
        
        # Assert - Verification
        assert sut_response_update.status_code == status.HTTP_200_OK
        group.refresh_from_db()
        assert group.name == "Delta Force"
        
        active_members = group.members.filter(is_deleted=False)
        assert active_members.count() == 1
        assert active_members.first().user == env.employee_a2
        
        deleted_members = TaskGroupMember.all_objects.filter(group=group, is_deleted=True)
        assert deleted_members.count() == 1
        assert deleted_members.first().user == env.employee_a1
        
        # Act - Delete
        sut_response_delete = api_client.delete(sut_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_204_NO_CONTENT
        group.refresh_from_db()
        assert group.is_deleted
