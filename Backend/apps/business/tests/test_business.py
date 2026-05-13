from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.business.models import Business
from apps.user.models import User
from apps.employee.models import UserRole, UserBusinessRole
from apps.employee.utils.permission_utils import sync_user_role_permissions

class BusinessTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.user = self.create_owner(authenticate=True)
        self.business_list_url = reverse("business-list")
        self.customer_list_url = reverse("business-customer-list")
        self.manager_url = reverse("business-manager")
        self.employee_url = reverse("business-employee")
        self.plan = self.create_plan(name="Test Plan", max_staff=5)

    def test_create_business_and_link_to_user(self):
        data = {
            "name": "Test Business",
            "gst_number": "22AAAAA0000A1Z5",
            "description": "A test Business",
        }
        response = self.client.post(self.business_list_url, data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.business)
        self.assertEqual(self.user.business.name, data["name"])

    def test_create_business_by_owner(self):
        data = {
            "name": "Another Business",
            "gst_number": "22BBBBB0000B1Z5",
            "description": "Owner creating another business",
        }
        response = self.client.post(self.business_list_url, data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_create_business_by_manager(self):
        manager = self.create_manager(authenticate=True)
        data = {"name": "Manager Business"}
        response = self.client.post(self.business_list_url, data=data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_business_by_employee(self):
        employee = self.create_employee(authenticate=True)
        data = {"name": "Employee Business"}
        response = self.client.post(self.business_list_url, data=data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_business_by_owner(self):
        business = Business.objects.create(name="Original Name")
        UserBusinessRole.objects.get_or_create(user=self.user, business=business, role=UserRole.OWNER)
        
        detail_url = reverse('business-detail', kwargs={'pk': business.id})
        detail_data = {"name": "Updated Name"}
        response = self.client.patch(detail_url, detail_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        business.refresh_from_db()
        self.assertEqual(business.name, detail_data["name"])

    def test_cannot_update_business_by_manager(self):
        business = Business.objects.create(name="Test Biz")
        manager = self.create_manager(username="test_manager", business=business, authenticate=True)
        
        detail_url = reverse('business-detail', kwargs={'pk': business.id})
        response = self.client.patch(detail_url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_update_business_by_employee(self):
        business = Business.objects.create(name="Test Biz")
        employee = self.create_employee(username="test_employee", business=business, authenticate=True)
        
        detail_url = reverse('business-detail', kwargs={'pk': business.id})
        response = self.client.patch(detail_url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_business_by_owner(self):
        business = Business.objects.create(name="To Delete")
        UserBusinessRole.objects.get_or_create(user=self.user, business=business, role=UserRole.OWNER)
        
        detail_url = reverse('business-detail', kwargs={'pk': business.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        business.refresh_from_db()
        self.assertTrue(business.is_deleted)

    def test_cannot_delete_business_by_manager(self):
        business = Business.objects.create(name="Test Biz")
        manager = self.create_manager(username="mgr_del", business=business, authenticate=True)
        
        detail_url = reverse('business-detail', kwargs={'pk': business.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_delete_business_by_employee(self):
        business = Business.objects.create(name="Test Biz")
        employee = self.create_employee(username="emp_del", business=business, authenticate=True)
        
        detail_url = reverse('business-detail', kwargs={'pk': business.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_multi_tenancy_isolation(self):
        # Business A & Owner A
        biz_a = Business.objects.create(name="Business A")
        user_a = self.create_owner(username="user_a", business=biz_a)
        
        # Business B & Owner B
        biz_b = Business.objects.create(name="Business B")
        user_b = self.create_owner(username="user_b", business=biz_b)

        self.client.force_authenticate(user=user_a)
        
        # Try to access Business B detail
        detail_url_b = reverse('business-detail', kwargs={'pk': biz_b.id})
        response = self.client.get(detail_url_b)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # List should only show Business A
        response = self.client.get(self.business_list_url)
        from apps.employee.models import UserRole
        expected_count = Business.objects.filter(user_roles__user=user_a, user_roles__role=UserRole.OWNER).count()
        self.assertEqual(len(response.data['results']), expected_count)

    def test_business_filtering(self):
        """Test business filters."""
        # Create and link business
        biz = Business.objects.create(name="Filtering Biz")
        from apps.employee.models import UserBusinessRole, UserRole
        UserBusinessRole.objects.create(user=self.user, business=biz, role=UserRole.OWNER)
        self.user.refresh_from_db()
        
        self.client.force_authenticate(user=self.user)
        
        # 1. Name contains (match)
        search_name = "Filtering"
        response = self.client.get(f"{self.business_list_url}?name={search_name}")
        from apps.employee.models import UserRole
        expected_count = Business.objects.filter(user_roles__user=self.user, user_roles__role=UserRole.OWNER, name__icontains=search_name).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["name"], "Filtering Biz")
        
        # 2. Name contains (no match)
        search_name = "NonExistent"
        response = self.client.get(f"{self.business_list_url}?name={search_name}")
        from apps.employee.models import UserRole
        expected_count = Business.objects.filter(user_roles__user=self.user, user_roles__role=UserRole.OWNER, name__icontains=search_name).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        
    def test_create_manager(self):
        # Setup using helpers
        business, plan, sub = self.setup_business_with_plan(business_name="Test Biz")
        UserBusinessRole.objects.create(user=self.user, business=business, role=UserRole.OWNER)
        sync_user_role_permissions(self.user)

        data = {
            "user": {
                "username": "unique_manager_name",
                "password": "Password123!",
                "email": "manager_unique@example.com",
                "mobile_number": "9000000005",
            },
            "employee_details": {"salary": 10000},
            "assigned_branches": []
        }
        response = self.client.post(self.manager_url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="unique_manager_name", business_roles__role=UserRole.MANAGER).exists())


    def test_create_employee(self):
        business, plan, sub = self.setup_business_with_plan(business_name="Test Biz 2")
        UserBusinessRole.objects.create(user=self.user, business=business, role=UserRole.OWNER)
        sync_user_role_permissions(self.user)

        data = {
            "user": {
                "username": "unique_employee_name",
                "password": "Password123!",
                "email": "emp_unique@example.com",
                "mobile_number": "9000000006",
            },
            "employee_details": {"salary": 5000},
            "assigned_branches": []
        }
        response = self.client.post(self.employee_url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="unique_employee_name", business_roles__role=UserRole.EMPLOYEE).exists())

    def test_cannot_create_manager_by_manager(self):
        business, plan, sub = self.setup_business_with_plan(business_name="Test Biz 3")
        manager = self.create_manager(username="manager_u", business=business, authenticate=True)
        
        data = {
            "user": {
                "username": "another_manager",
                "password": "Password123!",
                "email": "mgr_another@example.com",
                "mobile_number": "9000000007",
            },
            "employee_details": {"salary": 15000},
            "assigned_branches": []
        }
        response = self.client.post(self.manager_url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_manager_by_employee(self):
        business, plan, sub = self.setup_business_with_plan(business_name="Test Biz 4")
        employee = self.create_employee(username="employee_u", business=business, authenticate=True)
        
        data = {
            "user": {
                "username": "manager_fail",
                "password": "Password123!",
                "email": "mgr_fail@example.com",
                "mobile_number": "9000000008",
            },
            "employee_details": {"salary": 1000},
            "assigned_branches": []
        }
        response = self.client.post(self.manager_url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_employee_by_manager(self):
        business, plan, sub = self.setup_business_with_plan(business_name="Test Biz 5")
        manager = self.create_manager(username="manager_ok", business=business, authenticate=True)
        
        data = {
            "user": {
                "username": "new_employee",
                "password": "Password123!",
                "email": "new_emp_ok@example.com",
                "mobile_number": "9000000009",
            },
            "employee_details": {"salary": 4500},
            "assigned_branches": []
        }
        response = self.client.post(self.employee_url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="new_employee", business_roles__role=UserRole.EMPLOYEE).exists())

    def test_cannot_create_employee_by_employee(self):
        business, plan, sub = self.setup_business_with_plan(business_name="Test Biz 6")
        employee = self.create_employee(username="employee_fail", business=business, authenticate=True)
        
        data = {
            "user": {
                "username": "employee_fail_2",
                "password": "Password123!",
                "email": "emp_fail_2@example.com",
                "mobile_number": "9000000100",
            },
            "employee_details": {"salary": 3000},
            "assigned_branches": []
        }
        response = self.client.post(self.employee_url, data=data, format='json')
        # Caught in EmployeeSerializer.validate
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class BusinessCustomerTestCase(BaseTestCase):
    """Test BusinessCustomer filtering."""

    def setUp(self):
        super().setUp()
        self.business, self.plan, self.sub = self.setup_business_with_plan(business_name="Biz A")
        self.owner = self.create_owner(business=self.business)
        self.list_url = reverse("business-customer-list")
        
        from apps.business.models import BusinessCustomer
        # Seed customers
        self.c1 = BusinessCustomer.objects.create(business=self.business, name="John Doe", mobile_number="1234567890")
        self.c2 = BusinessCustomer.objects.create(business=self.business, name="Jane Smith", mobile_number="0987654321")

    def test_customer_filtering(self):
        """Test customer filters."""
        self.client.force_authenticate(user=self.owner)
        
        # 1. Exact mobile number (match)
        response = self.client.get(f"{self.list_url}?mobile_number=1234567890")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "John Doe")
        
        # 2. Exact mobile number (no match)
        response = self.client.get(f"{self.list_url}?mobile_number=0000000000")
        self.assertEqual(len(response.data["results"]), 0)

    def test_customer_pagination(self):
        """Test customer pagination."""
        self.client.force_authenticate(user=self.owner)
        from apps.business.models import BusinessCustomer
        # Seed 7 more (total 9)
        for i in range(7):
            BusinessCustomer.objects.create(
                business=self.business,
                name=f"Customer {i}",
                mobile_number=f"90000000{i}"
            )
        
        # Page 1 (size 6)
        response = self.client.get(self.list_url)
        self.assertEqual(len(response.data["results"]), 6)
        
        # Page 2 (size 3)
        response = self.client.get(response.data["next"])
        self.assertEqual(len(response.data["results"]), 3)
