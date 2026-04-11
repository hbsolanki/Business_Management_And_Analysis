from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from apps.base.tests import BaseTestCase
from apps.tasks.models import Task
from apps.activity_log.models import ActivityLog


class TasksTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.task_list_url = reverse('tasks-list')
        # Seed two tasks
        self.task_a1 = Task.objects.create(
            business=self.business_a,
            assigned_by=self.owner_a,
            assignee=self.employee_a1,
            title="Task A1",
            description="Desc A1"
        )
        self.task_a2 = Task.objects.create(
            business=self.business_a,
            assigned_by=self.manager_a1,
            assignee=self.employee_a2,
            title="Task A2",
            description="Desc A2"
        )

    def test_task_crud_by_assigned_by(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        data = {
            "title": "Test Task",
            "description": "Test Description",
            "assignee_id": self.employee_a1.id,
            "status": Task.Status.PENDING
        }
        response = self.client.post(self.task_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_id = response.data['id']
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.TASKS)
        
        # Read
        url = reverse('tasks-detail', args=[task_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update
        response = self.client.patch(url, {"title": "Updated Title"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Task.objects.get(id=task_id).title, "Updated Title")
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.TASKS)
        self.assertEqual(log.meta['title']['old'], "Test Task")
        
        # Delete
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task_id).exists())
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.TASKS)

    def test_task_crud_by_assignee(self):
        self.client.force_authenticate(user=self.employee_a1)
        url = reverse('tasks-detail', args=[self.task_a1.id])

        # Read
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Update status
        response = self.client.patch(url, {"status": Task.Status.COMPLETED})
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
        data = {"title": "B Task", "description": "Work", "assignee_id": self.employee_a1.id}
        response = self.client.post(self.task_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_create_without_title(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "description": "Test Description",
            "assignee_id": self.employee_a1.id
        }
        response = self.client.post(self.task_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_task_create_without_status(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "title": "Test Title",
            "description": "Test Description",
            "assignee_id": self.employee_a1.id
        }
        response = self.client.post(self.task_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Task.Status.PENDING)

    def test_task_create_without_description(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "title": "Test Title",
            "assignee_id": self.employee_a1.id
        }
        response = self.client.post(self.task_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_task_create_without_remark(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "title": "Test Title",
            "description": "Test Description",
            "assignee_id": self.employee_a1.id
        }
        response = self.client.post(self.task_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_task_list_access_permissions(self):
        # Owner sees assigned tasks
        self.client.force_authenticate(user=self.owner_a)
        task1 = Task.objects.create(business=self.business_a, assigned_by=self.owner_a, assignee=self.employee_a1, title="Task 1", description="D1")
        task2 = Task.objects.create(business=self.business_a, assigned_by=self.owner_a, assignee=self.employee_a2, title="Task 2", description="D2")
        Task.objects.create(business=self.business_a, assigned_by=self.owner_a, assignee=self.owner_a, title="Task 3", description="D3")

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

    def test_task_filtering_combinations(self):
        """Test task filters."""
        self.client.force_authenticate(user=self.owner_a)
        from datetime import timedelta
        
        # task_a1: today
        Task.objects.filter(id=self.task_a1.id).update(
            title="Today Task",
            remarks="Excellent work",
            created_at=timezone.now()
        )
        # task_a2: yesterday
        Task.objects.filter(id=self.task_a2.id).update(
            title="Yesterday Task",
            remarks="Good effort",
            assigned_by=self.owner_a,
            created_at=timezone.now() - timedelta(days=1)
        )

        # 1. Title partial
        response = self.client.get(f"{self.task_list_url}?title=Today")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Today Task")

        # 2. Remarks partial
        response = self.client.get(f"{self.task_list_url}?remarks=Good")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["remarks"], "Good effort")

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
        from_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        response = self.client.get(f"{self.task_list_url}?from_date={from_date}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)
        self.assertGreaterEqual(response.data["results"][1]["created_at"][:10], from_date)

        # 6. To date
        to_date = (timezone.now().date() - timedelta(days=1)).isoformat()
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
    

        # 10. Title + Remarks
        response = self.client.get(f"{self.task_list_url}?title=Task&remarks=work")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Today Task")
        self.assertEqual(response.data["results"][0]["remarks"], "Excellent work")

    # --- PAGINATION ---

    def test_task_pagination(self):
        """Test task pagination."""
        self.client.force_authenticate(user=self.owner_a)
        # Seed 7 tasks
        for i in range(7):
            Task.objects.create(
                business=self.business_a,
                assigned_by=self.owner_a,
                assignee=self.owner_a,
                title=f"Extra {i}",
                description="D"
            )

        # Page 1 (size 6)
        response = self.client.get(self.task_list_url)
        self.assertEqual(len(response.data["results"]), 6)
        
        # Page 2 (size 2)
        response = self.client.get(response.data["next"])
        self.assertEqual(len(response.data["results"]), 2)
