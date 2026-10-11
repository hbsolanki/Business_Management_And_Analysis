import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.business.models import Business, BusinessCustomer
from apps.user.models import User
from apps.employee.models import UserRole, UserBusinessRole
from apps.employee.utils.permission_utils import sync_user_role_permissions


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def business_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.user = tc.create_owner(authenticate=False)
    tc.business_list_url = reverse("business-list")
    tc.customer_list_url = reverse("business-customer-list")
    tc.manager_url = reverse("business-manager")
    tc.employee_url = reverse("business-employee")
    tc.plan = tc.create_plan(name="Test Plan", max_staff=5)
    return tc


@pytest.mark.django_db
class TestBusiness:

    def test_create_business_and_link_to_user(self, api_client, business_env):
        # Arrange
        sut_url = business_env.business_list_url
        api_client.force_authenticate(user=business_env.user)
        payload = {
            "name": "Test Business",
            "gst_number": "22AAAAA0000A1Z5",
            "description": "A test Business",
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload)

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        business_env.user.refresh_from_db()
        assert business_env.user.business is not None
        assert business_env.user.business.name == payload["name"]

    def test_create_business_by_owner(self, api_client, business_env):
        # Arrange
        sut_url = business_env.business_list_url
        api_client.force_authenticate(user=business_env.user)
        payload = {
            "name": "Another Business",
            "gst_number": "22BBBBB0000B1Z5",
            "description": "Owner creating another business",
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload)

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED

    def test_cannot_create_business_by_manager(self, api_client, business_env):
        # Arrange
        sut_url = business_env.business_list_url
        manager = business_env.create_manager(authenticate=False)
        api_client.force_authenticate(user=manager)
        payload = {"name": "Manager Business"}

        # Act
        sut_response = api_client.post(sut_url, data=payload)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_create_business_by_employee(self, api_client, business_env):
        # Arrange
        sut_url = business_env.business_list_url
        employee = business_env.create_employee(authenticate=False)
        api_client.force_authenticate(user=employee)
        payload = {"name": "Employee Business"}

        # Act
        sut_response = api_client.post(sut_url, data=payload)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_business_by_owner(self, api_client, business_env):
        # Arrange
        sut_business = Business.objects.create(name="Original Name")
        UserBusinessRole.objects.get_or_create(user=business_env.user, business=sut_business, role=UserRole.OWNER)
        sut_detail_url = reverse('business-detail', kwargs={'pk': sut_business.id})
        api_client.force_authenticate(user=business_env.user)
        detail_data = {"name": "Updated Name"}

        # Act
        sut_response = api_client.patch(sut_detail_url, detail_data)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        sut_business.refresh_from_db()
        assert sut_business.name == detail_data["name"]

    def test_cannot_update_business_by_manager(self, api_client, business_env):
        # Arrange
        sut_business = Business.objects.create(name="Test Biz")
        manager = business_env.create_manager(username="test_manager", business=sut_business, authenticate=False)
        api_client.force_authenticate(user=manager)
        sut_detail_url = reverse('business-detail', kwargs={'pk': sut_business.id})

        # Act
        sut_response = api_client.patch(sut_detail_url, {"name": "Hacked"})

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_update_business_by_employee(self, api_client, business_env):
        # Arrange
        sut_business = Business.objects.create(name="Test Biz")
        employee = business_env.create_employee(username="test_employee", business=sut_business, authenticate=False)
        api_client.force_authenticate(user=employee)
        sut_detail_url = reverse('business-detail', kwargs={'pk': sut_business.id})

        # Act
        sut_response = api_client.patch(sut_detail_url, {"name": "Hacked"})

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_business_by_owner(self, api_client, business_env):
        # Arrange
        sut_business = Business.objects.create(name="To Delete")
        UserBusinessRole.objects.get_or_create(user=business_env.user, business=sut_business, role=UserRole.OWNER)
        sut_detail_url = reverse('business-detail', kwargs={'pk': sut_business.id})
        api_client.force_authenticate(user=business_env.user)

        # Act
        sut_response = api_client.delete(sut_detail_url)

        # Assert
        assert sut_response.status_code == status.HTTP_204_NO_CONTENT
        sut_business.refresh_from_db()
        assert sut_business.is_deleted is True

    def test_cannot_delete_business_by_manager(self, api_client, business_env):
        # Arrange
        sut_business = Business.objects.create(name="Test Biz")
        manager = business_env.create_manager(username="mgr_del", business=sut_business, authenticate=False)
        api_client.force_authenticate(user=manager)
        sut_detail_url = reverse('business-detail', kwargs={'pk': sut_business.id})

        # Act
        sut_response = api_client.delete(sut_detail_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_delete_business_by_employee(self, api_client, business_env):
        # Arrange
        sut_business = Business.objects.create(name="Test Biz")
        employee = business_env.create_employee(username="emp_del", business=sut_business, authenticate=False)
        api_client.force_authenticate(user=employee)
        sut_detail_url = reverse('business-detail', kwargs={'pk': sut_business.id})

        # Act
        sut_response = api_client.delete(sut_detail_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_multi_tenancy_isolation(self, api_client, business_env):
        # Arrange
        biz_a = Business.objects.create(name="Business A")
        user_a = business_env.create_owner(username="user_a", business=biz_a)

        biz_b = Business.objects.create(name="Business B")
        business_env.create_owner(username="user_b", business=biz_b)

        api_client.force_authenticate(user=user_a)
        sut_detail_url_b = reverse('business-detail', kwargs={'pk': biz_b.id})
        sut_list_url = business_env.business_list_url

        # Act - Try to access Business B detail
        sut_response_detail = api_client.get(sut_detail_url_b)

        # Assert
        assert sut_response_detail.status_code == status.HTTP_404_NOT_FOUND

        # Act - List
        sut_response_list = api_client.get(sut_list_url)

        # Assert
        expected_count = Business.objects.filter(user_roles__user=user_a, user_roles__role=UserRole.OWNER).count()
        assert len(sut_response_list.data['results']) == expected_count

    def test_business_filtering(self, api_client, business_env):
        # Arrange
        biz = Business.objects.create(name="Filtering Biz")
        UserBusinessRole.objects.create(user=business_env.user, business=biz, role=UserRole.OWNER)
        business_env.user.refresh_from_db()
        api_client.force_authenticate(user=business_env.user)
        sut_list_url = business_env.business_list_url

        # Act & Assert - 1. Name contains (match)
        search_name = "Filtering"
        sut_res_match = api_client.get(f"{sut_list_url}?name={search_name}")
        expected_count = Business.objects.filter(user_roles__user=business_env.user, user_roles__role=UserRole.OWNER, name__icontains=search_name).count()
        assert len(sut_res_match.data["results"]) == expected_count
        assert sut_res_match.data["results"][0]["name"] == "Filtering Biz"

        # Act & Assert - 2. Name contains (no match)
        no_match_name = "NonExistent"
        sut_res_no_match = api_client.get(f"{sut_list_url}?name={no_match_name}")
        expected_no_match = Business.objects.filter(user_roles__user=business_env.user, user_roles__role=UserRole.OWNER, name__icontains=no_match_name).count()
        assert len(sut_res_no_match.data["results"]) == expected_no_match

    def test_create_manager(self, api_client, business_env):
        # Arrange
        business, plan, sub = business_env.setup_business_with_plan(business_name="Test Biz")
        UserBusinessRole.objects.create(user=business_env.user, business=business, role=UserRole.OWNER)
        sync_user_role_permissions(business_env.user)
        api_client.force_authenticate(user=business_env.user)
        sut_url = business_env.manager_url

        payload = {
            "user": {
                "username": "unique_manager_name",
                "password": "Password123!",
                "email": "manager_unique@example.com",
                "mobile_number": "9000000005",
            },
            "employee_details": {"salary": 10000},
            "assigned_branches": []
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username="unique_manager_name", business_roles__role=UserRole.MANAGER).exists()

    def test_create_employee(self, api_client, business_env):
        # Arrange
        business, plan, sub = business_env.setup_business_with_plan(business_name="Test Biz 2")
        UserBusinessRole.objects.create(user=business_env.user, business=business, role=UserRole.OWNER)
        sync_user_role_permissions(business_env.user)
        api_client.force_authenticate(user=business_env.user)
        sut_url = business_env.employee_url

        payload = {
            "user": {
                "username": "unique_employee_name",
                "password": "Password123!",
                "email": "emp_unique@example.com",
                "mobile_number": "9000000006",
            },
            "employee_details": {"salary": 5000},
            "assigned_branches": []
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username="unique_employee_name", business_roles__role=UserRole.EMPLOYEE).exists()

    def test_cannot_create_manager_by_manager(self, api_client, business_env):
        # Arrange
        business, plan, sub = business_env.setup_business_with_plan(business_name="Test Biz 3")
        manager = business_env.create_manager(username="manager_u", business=business, authenticate=False)
        api_client.force_authenticate(user=manager)
        sut_url = business_env.manager_url

        payload = {
            "user": {
                "username": "another_manager",
                "password": "Password123!",
                "email": "mgr_another@example.com",
                "mobile_number": "9000000007",
            },
            "employee_details": {"salary": 15000},
            "assigned_branches": []
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_create_manager_by_employee(self, api_client, business_env):
        # Arrange
        business, plan, sub = business_env.setup_business_with_plan(business_name="Test Biz 4")
        employee = business_env.create_employee(username="employee_u", business=business, authenticate=False)
        api_client.force_authenticate(user=employee)
        sut_url = business_env.manager_url

        payload = {
            "user": {
                "username": "manager_fail",
                "password": "Password123!",
                "email": "mgr_fail@example.com",
                "mobile_number": "9000000008",
            },
            "employee_details": {"salary": 1000},
            "assigned_branches": []
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_employee_by_manager(self, api_client, business_env):
        # Arrange
        business, plan, sub = business_env.setup_business_with_plan(business_name="Test Biz 5")
        manager = business_env.create_manager(username="manager_ok", business=business, authenticate=False)
        api_client.force_authenticate(user=manager)
        sut_url = business_env.employee_url

        payload = {
            "user": {
                "username": "new_employee",
                "password": "Password123!",
                "email": "new_emp_ok@example.com",
                "mobile_number": "9000000009",
            },
            "employee_details": {"salary": 4500},
            "assigned_branches": []
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username="new_employee", business_roles__role=UserRole.EMPLOYEE).exists()

    def test_cannot_create_employee_by_employee(self, api_client, business_env):
        # Arrange
        business, plan, sub = business_env.setup_business_with_plan(business_name="Test Biz 6")
        employee = business_env.create_employee(username="employee_fail", business=business, authenticate=False)
        api_client.force_authenticate(user=employee)
        sut_url = business_env.employee_url

        payload = {
            "user": {
                "username": "employee_fail_2",
                "password": "Password123!",
                "email": "emp_fail_2@example.com",
                "mobile_number": "9000000100",
            },
            "employee_details": {"salary": 3000},
            "assigned_branches": []
        }

        # Act
        sut_response = api_client.post(sut_url, data=payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN


@pytest.fixture
def customer_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.business, tc.plan, tc.sub = tc.setup_business_with_plan(business_name="Biz A")
    tc.owner = tc.create_owner(business=tc.business)
    tc.list_url = reverse("business-customer-list")
    tc.c1 = BusinessCustomer.objects.create(business=tc.business, name="John Doe", mobile_number="1234567890")
    tc.c2 = BusinessCustomer.objects.create(business=tc.business, name="Jane Smith", mobile_number="0987654321")
    return tc


@pytest.mark.django_db
class TestBusinessCustomer:

    def test_customer_filtering(self, api_client, customer_env):
        # Arrange
        api_client.force_authenticate(user=customer_env.owner)
        sut_list_url = customer_env.list_url

        # Act - 1. Exact mobile number (match)
        sut_res_match = api_client.get(f"{sut_list_url}?mobile_number=1234567890")

        # Assert - 1
        assert len(sut_res_match.data["results"]) == 1
        assert sut_res_match.data["results"][0]["name"] == "John Doe"

        # Act - 2. Exact mobile number (no match)
        sut_res_no_match = api_client.get(f"{sut_list_url}?mobile_number=0000000000")

        # Assert - 2
        assert len(sut_res_no_match.data["results"]) == 0

    def test_customer_pagination(self, api_client, customer_env):
        # Arrange
        api_client.force_authenticate(user=customer_env.owner)
        for i in range(7):
            BusinessCustomer.objects.create(
                business=customer_env.business,
                name=f"Customer {i}",
                mobile_number=f"90000000{i}"
            )
        sut_list_url = customer_env.list_url

        # Act - Page 1 (size 6)
        sut_page1_res = api_client.get(sut_list_url)

        # Assert - Page 1
        assert len(sut_page1_res.data["results"]) == 6

        # Act - Page 2 (size 3)
        sut_page2_res = api_client.get(sut_page1_res.data["next"])

        # Assert - Page 2
        assert len(sut_page2_res.data["results"]) == 3
