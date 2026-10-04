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

class TasksTestCase(BaseTaskTestCase):
    def test_task_crud_by_assignee(self):
        self.client.force_authenticate(user=self.employee_a1)
        url = reverse('tasks-detail', args=[self.task_a1.id])

        # Read
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Update status
        response = self.client.patch(url, {"status": Task.Status.COMPLETED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task_a1.refresh_from_db()
        self.assertEqual(self.task_a1.status, Task.Status.COMPLETED)

        # Delete forbidden
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    def test_task_read_update_delete_by_third_user(self):
        # Third user blocked
        self.client.force_authenticate(user=self.manager_a1)
        url = reverse('tasks-detail', args=[self.task_a1.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    def test_task_crud_by_diffrent_business_user(self):
        # Cross-business access blocked
        self.client.force_authenticate(user=self.owner_b)
        url = reverse('tasks-detail', args=[self.task_a1.id])

        # Read blocked
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Create blocked
        data = {"title": "B Task", "description": "Work", "task_assignment": {"assignee_id": self.employee_a1.id}}
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    def test_task_create_without_title(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "description": "Test Description",
            "task_assignment": {"assignee_id": self.employee_a1.id
        }}
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)
    def test_task_create_without_status(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "title": "Test Title",
            "description": "Test Description",
            "task_assignment": {"assignee_id": self.employee_a1.id
        }}
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Task.Status.PENDING)
    def test_task_create_without_description(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "title": "Test Title",
            "task_assignment": {"assignee_id": self.employee_a1.id
        }}
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)
    def test_task_create_without_remark(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "title": "Test Title",
            "description": "Test Description",
            "task_assignment": {"assignee_id": self.employee_a1.id
        }}
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    def test_task_list_access_permissions(self):
        # Owner sees assigned tasks
        self.client.force_authenticate(user=self.owner_a)
        
        t1 = Task.objects.create(business=self.business_a, branch=self.branch_a1, assigned_by=self.owner_a, title="Task 1", description="D1")
        TaskAssignment.objects.create(task=t1, assignee=self.employee_a1)
        
        t2 = Task.objects.create(business=self.business_a, branch=self.branch_a2, assigned_by=self.owner_a, title="Task 2", description="D2")
        TaskAssignment.objects.create(task=t2, assignee=self.employee_a2)
        
        t3 = Task.objects.create(business=self.business_a, branch=self.branch_a1, assigned_by=self.owner_a, title="Task 3", description="D3")
        TaskAssignment.objects.create(task=t3, assignee=self.owner_a)

        # Owner sees own (task_a1 + task1 + task2 + task3 = 4)
        response = self.client.get(self.task_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 4)

        # Employee 1 sees own only
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(self.task_list_url)
        self.assertEqual(len(response.data['results']), 2)

        # Employee 2 sees own only
        self.client.force_authenticate(user=self.employee_a2)
        response = self.client.get(self.task_list_url)
        self.assertEqual(len(response.data['results']), 2)

    # --- FILTERING TESTS ---
    def test_task_pagination(self):
        """Test task pagination."""
        self.client.force_authenticate(user=self.owner_a)
        # Seed 15 tasks
        for i in range(15):
            t = Task.objects.create(
                business=self.business_a,
                branch=self.branch_a1,
                assigned_by=self.owner_a,
                title=f"Bulk Task {i}",
                description="D"
            )
            TaskAssignment.objects.create(task=t, assignee=self.employee_a1)

        # Page 1 (size 6)
        response = self.client.get(self.task_list_url)
        self.assertEqual(len(response.data["results"]), 6)
        
        # Page 2 (size 6)
        response = self.client.get(response.data["next"])
        self.assertEqual(len(response.data["results"]), 6)
    def test_task_deadline_authorization(self):
        """Test that only assigned_by (creator) can modify the deadline."""
        url = reverse('tasks-detail', args=[self.task_a1.id])
        deadline_time = timezone.now() + timezone.timedelta(days=2)

        # 1. As Assigner (owner_a), setting the deadline should succeed
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(url, {"deadline": deadline_time.isoformat()}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.task_a1.refresh_from_db()
        self.assertIsNotNone(self.task_a1.deadline)

        # 2. As Assignee (employee_a1), changing the deadline should fail
        self.client.force_authenticate(user=self.employee_a1)
        new_deadline_time = timezone.now() + timezone.timedelta(days=5)
        response = self.client.patch(url, {"deadline": new_deadline_time.isoformat()}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("deadline", response.data)

        # 3. As Assignee, updating other fields (like status) without changing deadline should succeed
        response = self.client.patch(url, {
            "status": Task.Status.IN_PROGRESS,
            "deadline": self.task_a1.deadline.isoformat()
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.task_a1.refresh_from_db()
        self.assertEqual(self.task_a1.status, Task.Status.IN_PROGRESS)
    def test_task_create_custom_reminder_action(self):
        """Test the custom action /api/tasks/{id}/create-reminder/ to create decoupled reminders."""
        self.client.force_authenticate(user=self.owner_a)
        
        
        # 1. Verify invalid payload is rejected
        url = reverse('tasks-detail', args=[self.task_a1.id]) + "create-reminder/"
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 2. Verify creating a custom reminder with valid data
        future_time = timezone.now() + timedelta(days=1)
        data = {
            "title": "Custom Task Alert",
            "content": "Check project milestones",
            "remind_at": future_time.isoformat()
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the created general reminder in DB
        reminder_id = response.data['id']
        reminder = Reminder.objects.get(id=reminder_id)
        self.assertEqual(reminder.title, "Custom Task Alert")
        self.assertIn("Check project milestones", reminder.content)
        self.assertEqual(reminder.user, self.owner_a)
        self.assertIsNotNone(reminder.celery_task_id)

    # --- NEW EDGE CASE TESTS ---
    def test_cannot_assign_inactive_user(self):
        """Soft-deleted/Inactive user assignment is blocked."""
        self.client.force_authenticate(user=self.owner_a)
        self.employee_a1.is_active = False
        self.employee_a1.save(update_fields=["is_active"])

        data = {"title": "Task", "description": "Desc", "task_assignment": {"assignee_id": self.employee_a1.id}}
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not exist", str(response.data))
    def test_past_deadline_rejected(self):
        """Deadline in the past is rejected."""
        self.client.force_authenticate(user=self.owner_a)
        past_time = timezone.now() - timezone.timedelta(days=1)
        data = {
            "title": "Task", "description": "Desc",
            "task_assignment": {"assignee_id": self.employee_a1.id},
            "deadline": past_time.isoformat()
        }
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("future", str(response.data))
    def test_revert_completed_clears_timestamp(self):
        """completed_at becomes None if status reverts from COMPLETED."""
        self.client.force_authenticate(user=self.employee_a1)
        url = reverse('tasks-detail', args=[self.task_a1.id])
        
        # Mark Complete
        response = self.client.patch(url, {"status": Task.Status.COMPLETED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task_a1.refresh_from_db()
        self.assertIsNotNone(self.task_a1.completed_at)

        # Revert to Pending
        response = self.client.patch(url, {"status": Task.Status.PENDING}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task_a1.refresh_from_db()
        self.assertIsNone(self.task_a1.completed_at)
