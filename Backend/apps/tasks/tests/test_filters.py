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

class TaskFiltersTestCase(BaseTaskTestCase):
    def test_task_crud_by_assigned_by(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        data = {
            "title": "Test Task",
            "description": "Test Description",
            "task_assignment": {"assignee_id": self.employee_a1.id},
            "status": Task.Status.PENDING
        }
        response = self.client.post(self.task_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_id = response.data['id']
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.TASKS)
        
        # Read
        url = reverse('tasks-detail', args=[task_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update
        response = self.client.patch(url, {"title": "Updated Title"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Task.objects.get(id=task_id).title, "Updated Title")
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.TASKS)
        self.assertEqual(log.meta['title']['old'], "Test Task")
        
        # Delete
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task_id).exists())
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.TASKS)
    def test_task_filtering_combinations(self):
        """Test task filters."""
        self.client.force_authenticate(user=self.owner_a)
        
        # task_a1: today
        Task.objects.filter(id=self.task_a1.id).update(
            title="Today Task",
            created_at=timezone.now()
        )
        # task_a2: yesterday
        Task.objects.filter(id=self.task_a2.id).update(
            title="Yesterday Task",
            assigned_by=self.owner_a,
            created_at=timezone.now() - timedelta(days=1)
        )

        # 1. Title partial
        response = self.client.get(f"{self.task_list_url}?title=Today")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Today Task")


        # 3. Assignee exact
        response = self.client.get(f"{self.task_list_url}?assignee={self.employee_a1.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["assignee"]["id"], self.employee_a1.id)

        # 4. Assigned by exact
        response = self.client.get(f"{self.task_list_url}?assigned_by={self.owner_a.id}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["assigned_by"]["id"], self.owner_a.id)
        self.assertEqual(response.data["results"][1]["assigned_by"]["id"], self.owner_a.id)

        # 5. From date
        from_date = (timezone.localdate() - timedelta(days=1)).isoformat()
        response = self.client.get(f"{self.task_list_url}?from_date={from_date}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)
        self.assertGreaterEqual(response.data["results"][1]["created_at"][:10], from_date)

        # 6. To date
        to_date = (timezone.localdate() - timedelta(days=1)).isoformat()
        response = self.client.get(f"{self.task_list_url}?to_date={to_date}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["created_at"][:10], to_date)

        # 7. Title + Assignee
        response = self.client.get(f"{self.task_list_url}?title=Today&assignee={self.employee_a1.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Today Task")
        self.assertEqual(response.data["results"][0]["assignee"]["id"], self.employee_a1.id)


        # 8. Date range + Assignee
        response = self.client.get(f"{self.task_list_url}?from_date={from_date}&to_date={to_date}&assignee={self.employee_a2.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["created_at"][:10], to_date)
        self.assertEqual(response.data["results"][0]["assignee"]["id"], self.employee_a2.id)
    


    # --- PAGINATION ---
    def test_task_deadline_filtering(self):
        """Test task filtering by from_deadline, to_deadline, and overdue status."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Clear existing deadlines first
        Task.objects.all().delete()
        
        # 1. Task A: Overdue (deadline yesterday, status PENDING)
        task_overdue = Task.objects.create(
            business=self.business_a,
            assigned_by=self.owner_a,
            title="Overdue Task",
            description="D1",
            deadline=timezone.now() - timedelta(days=1),
            status=Task.Status.PENDING
        )
        TaskAssignment.objects.create(task=task_overdue, assignee=self.employee_a1)

        # 2. Task B: Upcoming (deadline tomorrow, status PENDING)
        task_upcoming = Task.objects.create(
            business=self.business_a,
            assigned_by=self.owner_a,
            title="Upcoming Task",
            description="D2",
            deadline=timezone.now() + timedelta(days=1),
            status=Task.Status.PENDING
        )
        TaskAssignment.objects.create(task=task_upcoming, assignee=self.employee_a1)

        # 3. Task C: Completed yesterday (deadline yesterday, status COMPLETED)
        task_completed_yesterday = Task.objects.create(
            business=self.business_a,
            assigned_by=self.owner_a,
            title="Completed Task",
            description="D3",
            deadline=timezone.now() - timedelta(days=1),
            status=Task.Status.COMPLETED
        )
        TaskAssignment.objects.create(task=task_completed_yesterday, assignee=self.employee_a1)


        # Test from_deadline & to_deadline
        from_deadline = (timezone.now() + timedelta(hours=12)).isoformat()
        to_deadline = (timezone.now() + timedelta(days=2)).isoformat()
        qs = urlencode({"from_deadline": from_deadline, "to_deadline": to_deadline})
        response = self.client.get(f"{self.task_list_url}?{qs}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {t["id"] for t in response.data["results"]}
        self.assertIn(task_upcoming.id, returned_ids)
        self.assertNotIn(task_overdue.id, returned_ids)
    def test_task_reassignment_notification(self):
        """Reassigning a task sends notification to new assignee."""
        
        self.client.force_authenticate(user=self.owner_a)
        url = reverse('tasks-detail', args=[self.task_a1.id])
        
        with patch('apps.tasks.views.send_task_assigned_notification') as mock_notify:
            # Change assignee from employee_a1 to employee_a2
            response = self.client.patch(url, {"task_assignment": {"assignee_id": self.employee_a2.id}}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            self.task_a1.refresh_from_db()
            assignment = self.task_a1.assignments.filter(assignee_type__model='user').first()
            self.assertEqual(assignment.assignee_id, self.employee_a2.id)
            mock_notify.assert_called_once()
            args, kwargs = mock_notify.call_args
            self.assertEqual(args[0].id, self.task_a1.id)

    # --- TASK GROUP TESTS ---
    def test_task_filtering_by_taskgroup(self):
        """Test filtering tasks by taskgroup ID."""
        self.client.force_authenticate(user=self.owner_a)
        
        group = TaskGroup.objects.create(name="Charlie Team", business=self.business_a, created_by=self.owner_a)
        TaskGroupMember.objects.create(group=group, user=self.employee_a1)
        
        # Create a task for this group
        data = {
            "title": "Group Filter Task",
            "description": "Desc",
            "task_assignment": {"assignee_group_id": group.id
        }}
        self.client.post(self.task_list_url, data, format='json')
        
        # Verify filtering
        response = self.client.get(f"{self.task_list_url}?taskgroup={group.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Group Filter Task")
