from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from apps.base.tests import BaseTestCase
from apps.tasks.models import Task, TaskAssignment, TaskGroup, TaskGroupMember
from datetime import timedelta
from urllib.parse import urlencode
from unittest.mock import patch
from apps.notification.models import Reminder
from apps.activity_log.models import ActivityLog

class BaseTaskTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.task_list_url = reverse('tasks-list')
        self.task_a1 = Task.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            assigned_by=self.owner_a,
            title="Task A1",
            description="Desc A1"
        )
        TaskAssignment.objects.create(task=self.task_a1, assignee=self.employee_a1)
        
        self.task_a2 = Task.objects.create(
            business=self.business_a,
            branch=self.branch_a2,
            assigned_by=self.manager_a1,
            title="Task A2",
            description="Desc A2"
        )
        TaskAssignment.objects.create(task=self.task_a2, assignee=self.employee_a2)

class TaskGroupsTestCase(BaseTaskTestCase):
    def test_task_group_create_permissions(self):
        url = reverse('task-groups-list')
        
        # Owner can create
        self.client.force_authenticate(user=self.owner_a)
        data = {"name": "Owners Group", "is_private": False}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Employee cannot create
        self.client.force_authenticate(user=self.employee_a1)
        data = {"name": "Employee Group"}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    def test_task_group_visibility(self):
        group1 = TaskGroup.objects.create(name="Public Group", business=self.business_a, created_by=self.owner_a, is_private=False)
        group2 = TaskGroup.objects.create(name="Private Group", business=self.business_a, created_by=self.owner_a, is_private=True)
        TaskGroupMember.objects.create(group=group2, user=self.employee_a2)

        url = reverse('task-groups-list')

        # Owner sees all groups
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(url)
        # 2 created here
        self.assertGreaterEqual(len(response.data["results"]), 2)

        # Employee 1 sees only public group
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(url)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], group1.id)

        # Employee 2 sees public group and their private group
        self.client.force_authenticate(user=self.employee_a2)
        response = self.client.get(url)
        self.assertEqual(len(response.data["results"]), 2)
    def test_create_task_with_group(self):
        group = TaskGroup.objects.create(name="Team Alpha", business=self.business_a, created_by=self.owner_a)
        TaskGroupMember.objects.create(group=group, user=self.employee_a1)
        TaskGroupMember.objects.create(group=group, user=self.employee_a2)

        self.client.force_authenticate(user=self.owner_a)
        
        # Create task with group
        data = {
            "title": "Group Task",
            "description": "Do this together",
            "task_assignment": {"assignee_group_id": group.id},
            "branch": self.branch_a1.id
        }
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_id = response.data['id']
        
        # Verify both employees can see the task
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(reverse('tasks-detail', args=[task_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Employee 2 is NOT in branch_a1, so they shouldn't see it
        self.client.force_authenticate(user=self.employee_a2)
        response = self.client.get(reverse('tasks-detail', args=[task_id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    def test_task_constraint_either_assignee_or_group(self):
        group = TaskGroup.objects.create(name="Team Beta", business=self.business_a, created_by=self.owner_a)
        self.client.force_authenticate(user=self.owner_a)
        
        # Provide both
        data_both = {
            "title": "Invalid Task",
            "description": "Both provided",
            "task_assignment": {
                "assignee_id": self.employee_a1.id,
                "assignee_group_id": group.id
            }
        }
        response = self.client.post(self.task_list_url, data_both, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Provide neither
        data_none = {
            "title": "Invalid Task",
            "description": "None provided",
        }
        response = self.client.post(self.task_list_url, data_none, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    def test_taskgroup_filtering_combinations(self):
        """Test TaskGroup filters."""
        url = reverse('task-groups-list')
        self.client.force_authenticate(user=self.owner_a)
        
        # Setup groups
        g1 = TaskGroup.objects.create(name="Alpha Team", business=self.business_a, created_by=self.owner_a, is_private=False)
        TaskGroupMember.objects.create(group=g1, user=self.employee_a1) # Employee 1 has first_name 'Employee'
        
        g2 = TaskGroup.objects.create(name="Beta Squad", business=self.business_a, created_by=self.owner_a, is_private=True)
        TaskGroupMember.objects.create(group=g2, user=self.employee_a2)
        
        # 1. Partial name filter
        response = self.client.get(f"{url}?name=Alpha")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Alpha Team")
        
        # 2. Member ID filter
        response = self.client.get(f"{url}?member_id={self.employee_a2.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Beta Squad")
        
        # 3. is_private filter
        response = self.client.get(f"{url}?is_private=true")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Beta Squad")
        

        
        # 5. Combination: Name + Member ID
        response = self.client.get(f"{url}?name=Beta&member_id={self.employee_a2.id}")
        self.assertEqual(len(response.data["results"]), 1)
    def test_taskgroup_update_and_member_management(self):
        """Test updating a task group's name and members, and check permissions."""
        group = TaskGroup.objects.create(name="Delta Team", business=self.business_a, created_by=self.owner_a)
        m1 = TaskGroupMember.objects.create(group=group, user=self.employee_a1)
        
        url = reverse('task-groups-detail', args=[group.id])
        
        # Non-owner cannot update
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.patch(url, {"name": "Hacked Team"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Owner can update
        self.client.force_authenticate(user=self.owner_a)
        
        # Update name and members (remove employee 1, add employee 2)
        data = {
            "name": "Delta Force",
            "members": [
                {"user_id": self.employee_a2.id}
            ]
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        group.refresh_from_db()
        self.assertEqual(group.name, "Delta Force")
        
        # Check active members
        active_members = group.members.filter(is_deleted=False)
        self.assertEqual(active_members.count(), 1)
        self.assertEqual(active_members.first().user, self.employee_a2)
        
        # Check soft deletion
        deleted_members = TaskGroupMember.all_objects.filter(group=group, is_deleted=True)
        self.assertEqual(deleted_members.count(), 1)
        self.assertEqual(deleted_members.first().user, self.employee_a1)
        
        # Owner can delete
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        group.refresh_from_db()
        self.assertTrue(group.is_deleted)
