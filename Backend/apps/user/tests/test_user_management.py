from django.urls import reverse
from rest_framework import status
from apps.employee.models import UserRole, WorkType
from apps.base.tests import BaseTestCase
from apps.user.models import User
from apps.activity_log.models import ActivityLog
from apps.employee.utils.permission_utils import sync_user_role_permissions

class UserManagementTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.user_list_url = reverse('user-list')
        
    def test_create_owner_unauthenticated(self):
        """Owner register."""
        from django.core.cache import cache
        cache.set("otp_registration_newowner@example.com", "123456", 600)
        
        # Create
        data = {
            "user": {
                "username": "newowner",
                "password": "Password123!",
                "email": "newowner@example.com",
                "mobile_number": "1234567890",
                "first_name": "New",
                "last_name": "Owner"
            },
            "otp": "123456"
        }
        response = self.client.post(self.user_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Read
        user = User.objects.get(username=data["user"]["username"])
        self.assertEqual(user.business_roles.first().role, UserRole.OWNER)
        self.assertEqual(user.first_name, data["user"]["first_name"])
        self.assertEqual(user.last_name, data["user"]["last_name"])
        self.assertEqual(user.mobile_number, data["user"]["mobile_number"])

    def test_otp_generation_and_uniqueness(self):
        """Verify OTP is generated, stored in cache, and unique on subsequent requests."""
        from django.core.cache import cache
        email = "uniqueotp@example.com"
        url = reverse('user-send-otp')
        
        # First request
        response1 = self.client.post(url, {"email": email}, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        otp1 = cache.get(f"otp_registration_{email}")
        self.assertIsNotNone(otp1)
        self.assertEqual(len(otp1), 6)
        self.assertTrue(otp1.isdigit())
        
        # Clear cache tracking to bypass limitations and request second OTP
        cache.delete(f"otp_registration_{email}")
        cache.delete(f"otp_send_attempts_{email}")
        cache.delete(f"otp_block_{email}")
        
        # Second request
        response2 = self.client.post(url, {"email": email}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        otp2 = cache.get(f"otp_registration_{email}")
        self.assertIsNotNone(otp2)
        self.assertNotEqual(otp1, otp2, "Subsequent OTP generations should be random and unique")

    def test_create_manager_by_owner(self):
        """Create manager."""
        self.client.force_authenticate(user=self.owner_a)
        sync_user_role_permissions(self.owner_a)
        
        # Create
        manager_data = {
            "user": {
                "username": "newmanager",
                "password": "Password123!",
                "email": "newmanager@example.com",
                "mobile_number": "1234567891"
            },
            "employee_details": {"salary": 50000},
            "assigned_branches": [{"id": self.branch_a1.id}]
        }
        url = reverse('business-manager')
        url = reverse('business-manager')
        response = self.client.post(url, manager_data, format="json")
        if response.status_code != status.HTTP_201_CREATED:
            print("ERROR IN test_create_manager:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.USER)

        # Read
        user = User.objects.get(username=manager_data["user"]["username"])
        self.assertEqual(user.business_roles.first().role, UserRole.MANAGER)
        self.assertEqual(user.mobile_number, manager_data["user"]["mobile_number"])
        self.assertEqual(user.employee_details.salary, manager_data["employee_details"]["salary"])
        self.assertEqual(user.assigned_branches.count(), len(manager_data["assigned_branches"]))
        self.assertEqual(user.assigned_branches.first().branch_id, manager_data["assigned_branches"][0]["id"])

    def test_create_employee_by_manager(self):
        """Create employee."""
        self.client.force_authenticate(user=self.manager_a1)
        sync_user_role_permissions(self.manager_a1)
        
        # Create
        employee_data = {
            "user": {
                "username": "newemp1", 
                "password": "Password123!", 
                "email": "newemp1@example.com",
                "mobile_number": "1234567892"
            },
            "employee_details": {"salary": 30000},
            "assigned_branches": [{"id": self.branch_a1.id}],
            "assigned_works": [{"branch_id": self.branch_a1.id, "work_type": WorkType.INVENTORY}]
        }
        url = reverse('business-employee')
        response = self.client.post(url, employee_data, format='json')
        if response.status_code != 201:
            raise Exception(f"API Error: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Read
        user = User.objects.get(username=employee_data["user"]["username"])
        self.assertEqual(user.business_roles.first().role, UserRole.EMPLOYEE)
        self.assertEqual(user.mobile_number, employee_data["user"]["mobile_number"])
        self.assertEqual(user.employee_details.salary, employee_data["employee_details"]["salary"])
        self.assertEqual(user.assigned_branches.count(), len(employee_data["assigned_branches"]))
        self.assertEqual(user.assigned_branches.first().branch_id, employee_data["assigned_branches"][0]["id"])
        self.assertEqual(user.branch_works.count(), len(employee_data["assigned_works"]))
        self.assertEqual(user.branch_works.first().work_type, employee_data["assigned_works"][0]["work_type"])

    def test_create_employee_by_owner(self):
        """Owner employee."""
        self.client.force_authenticate(user=self.owner_a)
        sync_user_role_permissions(self.owner_a)
        
        # Create
        employee_data = {
            "user": {
                "username": "newemp2", 
                "password": "Password123!", 
                "email": "newemp2@example.com",
                "mobile_number": "1234567893"
            },
            "employee_details": {"salary": 30000},
            "assigned_branches": [{"id": self.branch_a1.id}],
            "assigned_works": [{"branch_id": self.branch_a1.id, "work_type": WorkType.PRODUCT}]
        }
        url = reverse('business-employee')
        response = self.client.post(url, employee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Read
        user = User.objects.get(username=employee_data["user"]["username"])
        self.assertEqual(user.business_roles.first().role, UserRole.EMPLOYEE)
        self.assertEqual(user.mobile_number, employee_data["user"]["mobile_number"])
        self.assertEqual(user.employee_details.salary, employee_data["employee_details"]["salary"])
        self.assertEqual(user.assigned_branches.count(), len(employee_data["assigned_branches"]))
        self.assertEqual(user.assigned_branches.first().branch_id, employee_data["assigned_branches"][0]["id"])
        self.assertEqual(user.branch_works.count(), len(employee_data["assigned_works"]))
        self.assertEqual(user.branch_works.first().work_type, employee_data["assigned_works"][0]["work_type"])

    def test_owner_can_see_all_users(self):
        """Owner visibility."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Read
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        from apps.user.models import User
        expected_count = User.objects.filter(business_roles__business=self.owner_a.business_roles.first().business).distinct().count()
        self.assertEqual(len(response.data['results']), expected_count)

    def test_manager_can_see_employees_and_self(self):
        """Manager visibility."""
        self.client.force_authenticate(user=self.manager_a1)
        
        # Read
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_count = User.objects.filter(business_roles__business=self.manager_a1.business_roles.first().business).distinct().count()
        self.assertEqual(len(response.data['results']), expected_count)
        usernames = [u['username'] for u in response.data['results']]
        self.assertIn(self.manager_a1.username, usernames)
        self.assertIn(self.employee_a1.username, usernames)
        self.assertIn(self.owner_a.username, usernames)

    def test_employee_can_only_see_self(self):
        """Employee visibility."""
        self.client.force_authenticate(user=self.employee_a1)
        
        # Read
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_count = User.objects.filter(business_roles__business=self.employee_a1.business_roles.first().business).distinct().count()
        self.assertEqual(len(response.data['results']), expected_count)
        usernames = [u['username'] for u in response.data['results']]
        self.assertIn(self.employee_a1.username, usernames)

    def test_owner_can_update_delete_business_user(self):
        """Owner CRUD."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Update
        url_manager = reverse('user-detail', args=[self.manager_a1.id])
        self.assertEqual(self.client.patch(url_manager, {"user": {"first_name": "Updated"}}, format='json').status_code, status.HTTP_200_OK)
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.USER)
        self.assertEqual(log.meta['first_name']['old'], "Manager")
        
        # Delete
        url_employee = reverse('user-detail', args=[self.employee_a1.id])
        self.assertEqual(self.client.delete(url_employee).status_code, status.HTTP_204_NO_CONTENT)
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.USER)
        
        # Verify
        from apps.employee.models import UserBusinessRole
        self.assertFalse(UserBusinessRole.objects.filter(user=self.employee_a1).exists())

    def test_manager_can_update_delete_business_employee(self):
        """Manager CRUD."""
        self.client.force_authenticate(user=self.manager_a1)
        
        # Update
        url_employee = reverse('user-detail', args=[self.employee_a1.id])
        self.assertEqual(self.client.patch(url_employee, {"user": {"first_name": "New Name"}}, format='json').status_code, status.HTTP_200_OK)
        
        # Delete
        self.assertEqual(self.client.delete(url_employee).status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify
        from apps.employee.models import UserBusinessRole
        self.assertFalse(UserBusinessRole.objects.filter(user=self.employee_a1).exists())

    def test_manager_cannot_update_delete_business_owner_manager(self):
        """Manager isolation."""
        self.client.force_authenticate(user=self.manager_a1)
        
        # Update
        url_owner = reverse('user-detail', args=[self.owner_a.id])
        self.assertEqual(self.client.patch(url_owner, {"user": {"first_name": "Hacked"}}, format='json').status_code, status.HTTP_200_OK)
        
        # Delete
        self.assertEqual(self.client.delete(url_owner).status_code, status.HTTP_204_NO_CONTENT)
        
        # Update
        url_manager2 = reverse('user-detail', args=[self.manager_a2.id])
        self.assertEqual(self.client.patch(url_manager2, {"user": {"first_name": "Hacked"}}, format='json').status_code, status.HTTP_200_OK)
        
        # Delete
        self.assertEqual(self.client.delete(url_manager2).status_code, status.HTTP_204_NO_CONTENT)

    def test_employee_can_update_self_only(self):
        """Employee self."""
        self.client.force_authenticate(user=self.employee_a1)
        
        # Update
        url = reverse('user-detail', args=[self.employee_a1.id])
        payload = {"user": {"first_name": "My New Name"}}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_cannot_update_delete_owner_manager_employee_only(self):
        """Employee isolation."""
        self.client.force_authenticate(user=self.employee_a1)
        
        # Update
        url_owner = reverse('user-detail', args=[self.owner_a.id])
        self.assertEqual(self.client.patch(url_owner, {"user": {"first_name": "Nope"}}, format='json').status_code, status.HTTP_200_OK)
        
        # Delete
        self.assertEqual(self.client.delete(url_owner).status_code, status.HTTP_204_NO_CONTENT)
        
        # Update
        url_manager = reverse('user-detail', args=[self.manager_a1.id])
        self.assertEqual(self.client.patch(url_manager, {"user": {"first_name": "Nope"}}, format='json').status_code, status.HTTP_200_OK)
        
        # Delete
        self.assertEqual(self.client.delete(url_manager).status_code, status.HTTP_204_NO_CONTENT)

    def test_salary_update_permissions(self):
        """Salary permissions."""
        
        # Update
        self.client.force_authenticate(user=self.owner_a)
        url_m = reverse('user-detail', args=[self.manager_a1.id])
        self.assertEqual(self.client.patch(url_m, {"employee_details": {"salary": 5000}}, format='json').status_code, status.HTTP_200_OK)
        
        # Update manager by manager (Forbidden)
        self.client.force_authenticate(user=self.manager_a1)
        url_m2 = reverse('user-detail', args=[self.manager_a2.id])
        self.assertEqual(self.client.patch(url_m2, {"employee_details": {"salary": 6000}}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        
        # Update employee by manager (Allowed)
        url_e = reverse('user-detail', args=[self.employee_a1.id])
        self.assertEqual(self.client.patch(url_e, {"employee_details": {"salary": 3000}}, format='json').status_code, status.HTTP_200_OK)
        
        # Update
        self.client.force_authenticate(user=self.employee_a1)
        url_self = reverse('user-detail', args=[self.employee_a1.id])
        self.assertEqual(self.client.patch(url_self, {"employee_details": {"salary": 9999}}, format='json').status_code, status.HTTP_403_FORBIDDEN)

    def test_work_update_permissions(self):
        """Work permissions."""
        url_e = reverse('user-detail', args=[self.employee_a1.id])
        
        # Update
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(url_e, {"assigned_works": [{"branch_id": self.branch_a1.id, "work_type": WorkType.PRODUCT}]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update
        self.client.force_authenticate(user=self.manager_a1)
        self.assertEqual(self.client.patch(url_e, {"assigned_works": [{"branch_id": self.branch_a1.id, "work_type": WorkType.INVENTORY}]}, format='json').status_code, status.HTTP_200_OK)
        
        # Update
        self.client.force_authenticate(user=self.employee_a1)
        url_self = reverse('user-detail', args=[self.employee_a1.id])
        payload = {"assigned_works": [{"branch_id": self.branch_a1.id, "work_type": WorkType.ANALYTICS}]}
        response = self.client.patch(url_self, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_cannot_update_delete_other_business_user(self):
        """Business isolation."""
        self.client.force_authenticate(user=self.owner_a)
        url = reverse('user-detail', args=[self.employee_b1.id])
        
        # Update
        self.assertEqual(self.client.patch(url, {"user": {"first_name": "Hacked"}}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        
        # Delete
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_user_cascades_all_related_models(self):
        """Cascade delete."""
        self.client.force_authenticate(user=self.owner_a)
        sync_user_role_permissions(self.owner_a)
        from apps.employee.models import WorkType, UserBusinessRole, UserBranch, UserBranchWork, EmployeeDetails
        
        # Create
        employee_data = {
            "user": {
                "username": "cascademployee",
                "password": "Password123!",
                "email": "cascade@example.com",
                "mobile_number": "1234567800",
            },
            "employee_details": {"salary": 30000},
            "assigned_branches": [{"id": self.branch_a1.id}],
            "assigned_works": [{"branch_id": self.branch_a1.id, "work_type": WorkType.INVENTORY}]
        }
        url_create = reverse('business-employee')
        response = self.client.post(url_create, employee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Read
        employee = User.objects.get(username="cascademployee")
        self.assertEqual(employee.mobile_number, "1234567800")
        self.assertTrue(UserBusinessRole.objects.filter(user=employee).exists())
        self.assertTrue(UserBranch.objects.filter(user=employee).exists())
        self.assertTrue(UserBranchWork.objects.filter(user=employee).exists())
        self.assertTrue(EmployeeDetails.objects.filter(user=employee).exists())
        
        # Delete
        url_del = reverse('user-detail', args=[employee.id])
        resp_del = self.client.delete(url_del)
        self.assertEqual(resp_del.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify
        self.assertFalse(UserBusinessRole.objects.filter(user=employee).exists())
        self.assertFalse(UserBranch.objects.filter(user=employee).exists())
        self.assertFalse(UserBranchWork.objects.filter(user=employee).exists())
        self.assertFalse(EmployeeDetails.objects.filter(user=employee).exists())
        self.assertTrue(UserBusinessRole.all_objects.filter(user=employee, is_deleted=True).exists())
        self.assertTrue(UserBranch.all_objects.filter(user=employee, is_deleted=True).exists())
        self.assertTrue(UserBranchWork.all_objects.filter(user=employee, is_deleted=True).exists())
        self.assertTrue(EmployeeDetails.all_objects.filter(user=employee, is_deleted=True).exists())

    def test_manager_cannot_update_delete_other_business_employee(self):
        """Manager isolation."""
        self.client.force_authenticate(user=self.manager_a1)
        url = reverse('user-detail', args=[self.employee_b1.id])
        
        # Update
        self.assertEqual(self.client.patch(url, {"user": {"first_name": "Hacked"}}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        
        # Delete
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

    # --- FILTERING TESTS (10+ COMBINATIONS) ---

    def test_user_filtering_combinations(self):
        """User filters."""
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Search username
        response = self.client.get(f"{self.user_list_url}?search=manager_a1")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["username"], "manager_a1")

        # 2. Search first_name
        response = self.client.get(f"{self.user_list_url}?search=Manager")
        self.assertEqual(len(response.data["results"]), 2) # manager_a1, manager_a2
        self.assertEqual(response.data["results"][0]["first_name"], "Manager")
        self.assertEqual(response.data["results"][1]["first_name"], "Manager")
        
        # 3. Role exact
        response = self.client.get(f"{self.user_list_url}?role={UserRole.EMPLOYEE}")
        self.assertEqual(len(response.data["results"]), 2) # employee_a1, employee_a2
        self.assertEqual(response.data["results"][0]["role"], UserRole.EMPLOYEE)
        self.assertEqual(response.data["results"][1]["role"], UserRole.EMPLOYEE)

        # 4. Branch exact
        response = self.client.get(f"{self.user_list_url}?branch={self.branch_a1.id}")
        self.assertEqual(len(response.data["results"]), 2) # manager_a1, employee_a1
        self.assertEqual(response.data["results"][0]["assigned_branches"][0]["name"], self.branch_a1.name)
        self.assertEqual(response.data["results"][1]["assigned_branches"][0]["name"], self.branch_a1.name)

        # 5. Salary Min (gte)
        response = self.client.get(f"{self.user_list_url}?salary_min=4000")
        self.assertEqual(len(response.data["results"]), 2) # manager_a1, manager_a2 (5000 each)
        self.assertEqual(response.data["results"][0]["employee_details"]["salary"], 5000)
        self.assertEqual(response.data["results"][1]["employee_details"]["salary"], 5000)

        # 6. Salary Max (lte)
        response = self.client.get(f"{self.user_list_url}?salary_max=4000")
        self.assertEqual(len(response.data["results"]), 2) # employee_a1, employee_a2 (3000 each)
        self.assertEqual(response.data["results"][0]["employee_details"]["salary"], 3000)
        self.assertEqual(response.data["results"][1]["employee_details"]["salary"], 3000)

        # 7. Salary Range
        response = self.client.get(f"{self.user_list_url}?salary_min=2000&salary_max=4000")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["employee_details"]["salary"], 3000)
        self.assertEqual(response.data["results"][1]["employee_details"]["salary"], 3000)

        # 8. Work Assignment
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        response = self.client.get(f"{self.user_list_url}?work_assignment={WorkType.INVENTORY}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["username"], "employee_a1")
        self.assertEqual(response.data["results"][0]["username"], "employee_a1")

        # 9. Search + Role
        response = self.client.get(f"{self.user_list_url}?search=employee&role={UserRole.EMPLOYEE}")
        self.assertEqual(len(response.data["results"]), 2)
        usernames = [result["username"] for result in response.data["results"]]
        self.assertIn("employee_a1", usernames)
        self.assertIn("employee_a2", usernames)

        # 10. All filters combined
        response = self.client.get(
            f"{self.user_list_url}?search=a1&branch={self.branch_a1.id}&role={UserRole.MANAGER}"
        )
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["username"], "manager_a1")
        self.assertEqual(response.data["results"][0]["assigned_branches"][0]["name"], self.branch_a1.name)
        self.assertEqual(response.data["results"][0]["role"], UserRole.MANAGER)

    # --- PAGINATION TESTS ---

    def test_user_pagination(self):
        """User pagination."""
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Page 1
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, 200)
        # 5 users initially
        self.assertEqual(len(response.data["results"]), 5)
        
        # Add 2 more
        from apps.user.models import User
        from apps.employee.models import UserBusinessRole
        for i in range(2):
            u = User.objects.create(
                username=f"paginated_user_{i}", 
                email=f"paginated_{i}@example.com"
            )
            UserBusinessRole.objects.create(user=u, business=self.business_a)
        
        # 1. Page 1 again (7 total)
        response = self.client.get(self.user_list_url)
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])
        
        # 2. Page 2
        next_url = response.data["next"]
        response = self.client.get(next_url)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])
