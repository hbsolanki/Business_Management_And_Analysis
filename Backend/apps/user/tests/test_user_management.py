import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from apps.employee.models import UserRole, WorkType, UserBusinessRole, UserBranch, UserBranchWork, EmployeeDetails
from apps.base.tests import BaseTestCase
from apps.user.models import User
from apps.activity_log.models import ActivityLog
from apps.employee.utils.permission_utils import sync_user_role_permissions


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.user_list_url = reverse('user-list')
    return tc


@pytest.mark.django_db
class TestUserManagement:

    def test_create_owner_unauthenticated(self, api_client, user_env):
        # Arrange
        cache.set("otp_registration_newowner@example.com", "123456", 600)
        sut_url = user_env.user_list_url
        data = {
            "user": {
                "username": "newowner",
                "password": "Password123!",
                "email": "newowner@example.com",
                "mobile_number": "1234567890",
                "first_name": "New",
                "last_name": "Owner"
            }
        }

        # Act & Assert - 1. Missing OTP
        sut_missing_res = api_client.post(sut_url, data, format='json')
        assert sut_missing_res.status_code == status.HTTP_400_BAD_REQUEST
        assert "otp" in sut_missing_res.data

        # Act & Assert - 2. Invalid OTP
        data["otp"] = "000000"
        sut_invalid_res = api_client.post(sut_url, data, format='json')
        assert sut_invalid_res.status_code == status.HTTP_400_BAD_REQUEST
        assert "otp" in sut_invalid_res.data
        assert "Invalid or expired OTP" in sut_invalid_res.data["otp"]

        # Act & Assert - 3. Valid OTP (Create)
        data["otp"] = "123456"
        sut_create_res = api_client.post(sut_url, data, format='json')
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        assert cache.get("otp_registration_newowner@example.com") is None

        user = User.objects.get(username=data["user"]["username"])
        assert user.business_roles.first().role == UserRole.OWNER
        assert user.first_name == data["user"]["first_name"]
        assert user.last_name == data["user"]["last_name"]
        assert user.mobile_number == data["user"]["mobile_number"]

    def test_otp_generation_and_uniqueness(self, api_client, user_env):
        # Arrange
        email = "uniqueotp@example.com"
        sut_url = reverse('user-send-otp')

        # Act - First request
        sut_res1 = api_client.post(sut_url, {"email": email}, format='json')

        # Assert - First request
        assert sut_res1.status_code == status.HTTP_200_OK
        otp1 = cache.get(f"otp_registration_{email}")
        assert otp1 is not None
        assert len(otp1) == 6
        assert otp1.isdigit()

        # Arrange - Clear cache tracking to bypass limitations
        cache.delete(f"otp_registration_{email}")
        cache.delete(f"otp_send_attempts_{email}")
        cache.delete(f"otp_block_{email}")
        cache.delete(f"otp_send_cooldown_{email}")

        # Act - Second request
        sut_res2 = api_client.post(sut_url, {"email": email}, format='json')

        # Assert - Second request
        assert sut_res2.status_code == status.HTTP_200_OK
        otp2 = cache.get(f"otp_registration_{email}")
        assert otp2 is not None
        assert otp1 != otp2

    def test_create_manager_by_owner(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sync_user_role_permissions(user_env.owner_a)
        sut_url = reverse('business-manager')
        manager_data = {
            "user": {
                "username": "newmanager",
                "password": "Password123!",
                "email": "newmanager@example.com",
                "mobile_number": "1234567891"
            },
            "employee_details": {"salary": 50000},
            "assigned_branches": [{"id": user_env.branch_a1.id}]
        }

        # Act
        sut_response = api_client.post(sut_url, manager_data, format="json")

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        user_env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.USER)

        user = User.objects.get(username=manager_data["user"]["username"])
        assert user.business_roles.first().role == UserRole.MANAGER
        assert user.mobile_number == manager_data["user"]["mobile_number"]
        assert user.employee_details.salary == manager_data["employee_details"]["salary"]
        assert user.assigned_branches.count() == len(manager_data["assigned_branches"])
        assert user.assigned_branches.first().branch_id == manager_data["assigned_branches"][0]["id"]

    def test_create_employee_by_manager(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.manager_a1)
        sync_user_role_permissions(user_env.manager_a1)
        sut_url = reverse('business-employee')
        employee_data = {
            "user": {
                "username": "newemp1", 
                "password": "Password123!", 
                "email": "newemp1@example.com",
                "mobile_number": "1234567892"
            },
            "employee_details": {"salary": 30000},
            "assigned_branches": [{"id": user_env.branch_a1.id}],
            "assigned_works": [{"branch_id": user_env.branch_a1.id, "work_type": WorkType.INVENTORY}]
        }

        # Act
        sut_response = api_client.post(sut_url, employee_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username=employee_data["user"]["username"])
        assert user.business_roles.first().role == UserRole.EMPLOYEE
        assert user.mobile_number == employee_data["user"]["mobile_number"]
        assert user.employee_details.salary == employee_data["employee_details"]["salary"]
        assert user.assigned_branches.count() == len(employee_data["assigned_branches"])
        assert user.assigned_branches.first().branch_id == employee_data["assigned_branches"][0]["id"]
        assert user.branch_works.count() == len(employee_data["assigned_works"])
        assert user.branch_works.first().work_type == employee_data["assigned_works"][0]["work_type"]

    def test_create_employee_by_owner(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sync_user_role_permissions(user_env.owner_a)
        sut_url = reverse('business-employee')
        employee_data = {
            "user": {
                "username": "newemp2", 
                "password": "Password123!", 
                "email": "newemp2@example.com",
                "mobile_number": "1234567893"
            },
            "employee_details": {"salary": 30000},
            "assigned_branches": [{"id": user_env.branch_a1.id}],
            "assigned_works": [{"branch_id": user_env.branch_a1.id, "work_type": WorkType.PRODUCT}]
        }

        # Act
        sut_response = api_client.post(sut_url, employee_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username=employee_data["user"]["username"])
        assert user.business_roles.first().role == UserRole.EMPLOYEE
        assert user.mobile_number == employee_data["user"]["mobile_number"]
        assert user.employee_details.salary == employee_data["employee_details"]["salary"]
        assert user.assigned_branches.count() == len(employee_data["assigned_branches"])
        assert user.assigned_branches.first().branch_id == employee_data["assigned_branches"][0]["id"]
        assert user.branch_works.count() == len(employee_data["assigned_works"])
        assert user.branch_works.first().work_type == employee_data["assigned_works"][0]["work_type"]

    def test_owner_can_see_all_users(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_url = user_env.user_list_url

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        expected_count = User.objects.filter(business_roles__business=user_env.owner_a.business_roles.first().business).distinct().count()
        assert len(sut_response.data['results']) == expected_count

    def test_manager_can_see_employees_and_self(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.manager_a1)
        sut_url = user_env.user_list_url

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        expected_count = User.objects.filter(business_roles__business=user_env.manager_a1.business_roles.first().business).distinct().count()
        assert len(sut_response.data['results']) == expected_count
        usernames = [u['username'] for u in sut_response.data['results']]
        assert user_env.manager_a1.username in usernames
        assert user_env.employee_a1.username in usernames
        assert user_env.owner_a.username in usernames

    def test_employee_can_only_see_self(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.employee_a1)
        sut_url = user_env.user_list_url

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        expected_count = User.objects.filter(business_roles__business=user_env.employee_a1.business_roles.first().business).distinct().count()
        assert len(sut_response.data['results']) == expected_count
        usernames = [u['username'] for u in sut_response.data['results']]
        assert user_env.employee_a1.username in usernames

    def test_owner_can_update_delete_business_user(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_manager_url = reverse('user-detail', args=[user_env.manager_a1.id])
        sut_employee_url = reverse('user-detail', args=[user_env.employee_a1.id])

        # Act - Update
        sut_patch_res = api_client.patch(sut_manager_url, {"user": {"first_name": "Updated"}}, format='json')

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK
        log = user_env._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.USER)
        assert log.meta['first_name']['old'] == "Manager"

        # Act - Delete
        sut_del_res = api_client.delete(sut_employee_url)

        # Assert - Delete
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT
        user_env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.USER)
        assert not UserBusinessRole.objects.filter(user=user_env.employee_a1).exists()

    def test_manager_can_update_delete_business_employee(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.manager_a1)
        sut_employee_url = reverse('user-detail', args=[user_env.employee_a1.id])

        # Act - Update
        sut_patch_res = api_client.patch(sut_employee_url, {"user": {"first_name": "New Name"}}, format='json')

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK

        # Act - Delete
        sut_del_res = api_client.delete(sut_employee_url)

        # Assert - Delete
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not UserBusinessRole.objects.filter(user=user_env.employee_a1).exists()

    def test_manager_cannot_update_delete_business_owner_manager(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.manager_a1)
        sut_owner_url = reverse('user-detail', args=[user_env.owner_a.id])
        sut_manager2_url = reverse('user-detail', args=[user_env.manager_a2.id])

        # Act & Assert - Owner update/delete
        assert api_client.patch(sut_owner_url, {"user": {"first_name": "Hacked"}}, format='json').status_code == status.HTTP_200_OK
        assert api_client.delete(sut_owner_url).status_code == status.HTTP_204_NO_CONTENT

        # Act & Assert - Manager2 update/delete
        assert api_client.patch(sut_manager2_url, {"user": {"first_name": "Hacked"}}, format='json').status_code == status.HTTP_200_OK
        assert api_client.delete(sut_manager2_url).status_code == status.HTTP_204_NO_CONTENT

    def test_employee_can_update_self_only(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.employee_a1)
        sut_url = reverse('user-detail', args=[user_env.employee_a1.id])
        payload = {"user": {"first_name": "My New Name"}}

        # Act
        sut_response = api_client.patch(sut_url, payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK

    def test_employee_cannot_update_delete_owner_manager_employee_only(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.employee_a1)
        sut_owner_url = reverse('user-detail', args=[user_env.owner_a.id])
        sut_manager_url = reverse('user-detail', args=[user_env.manager_a1.id])

        # Act & Assert
        assert api_client.patch(sut_owner_url, {"user": {"first_name": "Nope"}}, format='json').status_code == status.HTTP_200_OK
        assert api_client.delete(sut_owner_url).status_code == status.HTTP_204_NO_CONTENT
        assert api_client.patch(sut_manager_url, {"user": {"first_name": "Nope"}}, format='json').status_code == status.HTTP_200_OK
        assert api_client.delete(sut_manager_url).status_code == status.HTTP_204_NO_CONTENT

    def test_salary_update_permissions(self, api_client, user_env):
        # Arrange & Act 1 - Owner updates manager
        api_client.force_authenticate(user=user_env.owner_a)
        sut_url_m = reverse('user-detail', args=[user_env.manager_a1.id])
        sut_res1 = api_client.patch(sut_url_m, {"employee_details": {"salary": 5000}}, format='json')
        assert sut_res1.status_code == status.HTTP_200_OK

        # Arrange & Act 2 - Manager updates another manager (Forbidden)
        api_client.force_authenticate(user=user_env.manager_a1)
        sut_url_m2 = reverse('user-detail', args=[user_env.manager_a2.id])
        sut_res2 = api_client.patch(sut_url_m2, {"employee_details": {"salary": 6000}}, format='json')
        assert sut_res2.status_code == status.HTTP_403_FORBIDDEN

        # Arrange & Act 3 - Manager updates employee (Allowed)
        sut_url_e = reverse('user-detail', args=[user_env.employee_a1.id])
        sut_res3 = api_client.patch(sut_url_e, {"employee_details": {"salary": 3000}}, format='json')
        assert sut_res3.status_code == status.HTTP_200_OK

        # Arrange & Act 4 - Employee updates self salary (Forbidden)
        api_client.force_authenticate(user=user_env.employee_a1)
        sut_url_self = reverse('user-detail', args=[user_env.employee_a1.id])
        sut_res4 = api_client.patch(sut_url_self, {"employee_details": {"salary": 9999}}, format='json')
        assert sut_res4.status_code == status.HTTP_403_FORBIDDEN

    def test_work_update_permissions(self, api_client, user_env):
        # Arrange
        sut_url_e = reverse('user-detail', args=[user_env.employee_a1.id])

        # Act & Assert - Owner update
        api_client.force_authenticate(user=user_env.owner_a)
        res1 = api_client.patch(sut_url_e, {"assigned_works": [{"branch_id": user_env.branch_a1.id, "work_type": WorkType.PRODUCT}]}, format='json')
        assert res1.status_code == status.HTTP_200_OK

        # Act & Assert - Manager update
        api_client.force_authenticate(user=user_env.manager_a1)
        res2 = api_client.patch(sut_url_e, {"assigned_works": [{"branch_id": user_env.branch_a1.id, "work_type": WorkType.INVENTORY}]}, format='json')
        assert res2.status_code == status.HTTP_200_OK

        # Act & Assert - Employee update self
        api_client.force_authenticate(user=user_env.employee_a1)
        res3 = api_client.patch(sut_url_e, {"assigned_works": [{"branch_id": user_env.branch_a1.id, "work_type": WorkType.ANALYTICS}]}, format='json')
        assert res3.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_cannot_update_delete_other_business_user(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_url = reverse('user-detail', args=[user_env.employee_b1.id])

        # Act & Assert - Update & Delete
        assert api_client.patch(sut_url, {"user": {"first_name": "Hacked"}}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_url).status_code == status.HTTP_404_NOT_FOUND

    def test_delete_user_cascades_all_related_models(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sync_user_role_permissions(user_env.owner_a)
        sut_create_url = reverse('business-employee')

        employee_data = {
            "user": {
                "username": "cascademployee",
                "password": "Password123!",
                "email": "cascade@example.com",
                "mobile_number": "1234567800",
            },
            "employee_details": {"salary": 30000},
            "assigned_branches": [{"id": user_env.branch_a1.id}],
            "assigned_works": [{"branch_id": user_env.branch_a1.id, "work_type": WorkType.INVENTORY}]
        }

        # Act - Create
        sut_create_res = api_client.post(sut_create_url, employee_data, format='json')
        assert sut_create_res.status_code == status.HTTP_201_CREATED

        employee = User.objects.get(username="cascademployee")
        assert employee.mobile_number == "1234567800"
        assert UserBusinessRole.objects.filter(user=employee).exists()
        assert UserBranch.objects.filter(user=employee).exists()
        assert UserBranchWork.objects.filter(user=employee).exists()
        assert EmployeeDetails.objects.filter(user=employee).exists()

        # Act - Delete
        sut_del_url = reverse('user-detail', args=[employee.id])
        sut_del_res = api_client.delete(sut_del_url)

        # Assert - Delete
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not UserBusinessRole.objects.filter(user=employee).exists()
        assert not UserBranch.objects.filter(user=employee).exists()
        assert not UserBranchWork.objects.filter(user=employee).exists()
        assert not EmployeeDetails.objects.filter(user=employee).exists()
        assert UserBusinessRole.all_objects.filter(user=employee, is_deleted=True).exists()
        assert UserBranch.all_objects.filter(user=employee, is_deleted=True).exists()
        assert UserBranchWork.all_objects.filter(user=employee, is_deleted=True).exists()
        assert EmployeeDetails.all_objects.filter(user=employee, is_deleted=True).exists()

    def test_manager_cannot_update_delete_other_business_employee(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.manager_a1)
        sut_url = reverse('user-detail', args=[user_env.employee_b1.id])

        # Act & Assert
        assert api_client.patch(sut_url, {"user": {"first_name": "Hacked"}}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_url).status_code == status.HTTP_404_NOT_FOUND

    def test_user_filtering_combinations(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_list_url = user_env.user_list_url

        # Act & Assert - 1. Search username
        res1 = api_client.get(f"{sut_list_url}?search=manager_a1")
        assert len(res1.data["results"]) == 1
        assert res1.data["results"][0]["username"] == "manager_a1"

        # Act & Assert - 2. Search first_name
        res2 = api_client.get(f"{sut_list_url}?search=Manager")
        assert len(res2.data["results"]) == 2
        assert res2.data["results"][0]["first_name"] == "Manager"
        assert res2.data["results"][1]["first_name"] == "Manager"

        # Act & Assert - 3. Role exact
        res3 = api_client.get(f"{sut_list_url}?role={UserRole.EMPLOYEE}")
        assert len(res3.data["results"]) == 2
        assert res3.data["results"][0]["role"] == UserRole.EMPLOYEE
        assert res3.data["results"][1]["role"] == UserRole.EMPLOYEE

        # Act & Assert - 4. Branch exact
        res4 = api_client.get(f"{sut_list_url}?branch={user_env.branch_a1.id}")
        assert len(res4.data["results"]) == 2
        assert res4.data["results"][0]["assigned_branches"][0]["name"] == user_env.branch_a1.name
        assert res4.data["results"][1]["assigned_branches"][0]["name"] == user_env.branch_a1.name

        # Act & Assert - 5. Salary Min
        res5 = api_client.get(f"{sut_list_url}?salary_min=4000")
        assert len(res5.data["results"]) == 2
        assert res5.data["results"][0]["employee_details"]["salary"] == 5000
        assert res5.data["results"][1]["employee_details"]["salary"] == 5000

        # Act & Assert - 6. Salary Max
        res6 = api_client.get(f"{sut_list_url}?salary_max=4000")
        assert len(res6.data["results"]) == 2
        assert res6.data["results"][0]["employee_details"]["salary"] == 3000
        assert res6.data["results"][1]["employee_details"]["salary"] == 3000

        # Act & Assert - 7. Salary Range
        res7 = api_client.get(f"{sut_list_url}?salary_min=2000&salary_max=4000")
        assert len(res7.data["results"]) == 2
        assert res7.data["results"][0]["employee_details"]["salary"] == 3000
        assert res7.data["results"][1]["employee_details"]["salary"] == 3000

        # Act & Assert - 8. Work Assignment
        user_env.assign_work_to_user(user_env.employee_a1, user_env.branch_a1, WorkType.INVENTORY)
        res8 = api_client.get(f"{sut_list_url}?work_assignment={WorkType.INVENTORY}")
        assert len(res8.data["results"]) == 1
        assert res8.data["results"][0]["username"] == "employee_a1"

        # Act & Assert - 9. Search + Role
        res9 = api_client.get(f"{sut_list_url}?search=employee&role={UserRole.EMPLOYEE}")
        assert len(res9.data["results"]) == 2
        usernames = [result["username"] for result in res9.data["results"]]
        assert "employee_a1" in usernames
        assert "employee_a2" in usernames

        # Act & Assert - 10. All filters combined
        res10 = api_client.get(f"{sut_list_url}?search=a1&branch={user_env.branch_a1.id}&role={UserRole.MANAGER}")
        assert len(res10.data["results"]) == 1
        assert res10.data["results"][0]["username"] == "manager_a1"
        assert res10.data["results"][0]["assigned_branches"][0]["name"] == user_env.branch_a1.name
        assert res10.data["results"][0]["role"] == UserRole.MANAGER

    def test_user_pagination(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_list_url = user_env.user_list_url

        # Act - Page 1 initial
        res1 = api_client.get(sut_list_url)
        assert res1.status_code == 200
        assert len(res1.data["results"]) == 5

        # Arrange - Add 2 more
        for i in range(2):
            u = User.objects.create(
                username=f"paginated_user_{i}", 
                email=f"paginated_{i}@example.com"
            )
            UserBusinessRole.objects.create(user=u, business=user_env.business_a)

        # Act - Page 1 again (7 total)
        res_page1 = api_client.get(sut_list_url)
        assert len(res_page1.data["results"]) == 6
        assert res_page1.data["next"] is not None

        # Act - Page 2
        res_page2 = api_client.get(res_page1.data["next"])
        assert len(res_page2.data["results"]) == 1
        assert res_page2.data["next"] is None

    def test_send_otp_duplicate_email_blocked(self, api_client, user_env):
        # Arrange
        sut_url = reverse('user-send-otp')

        # Act
        sut_response = api_client.post(sut_url, {"email": user_env.owner_a.email}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in sut_response.data

    def test_register_weak_password_rejected(self, api_client, user_env):
        # Arrange
        email = "weakpass@example.com"
        cache.set(f"otp_registration_{email}", "123456", 600)
        sut_url = user_env.user_list_url
        payload = {
            "otp": "123456",
            "user": {
                "username": "weakpassuser",
                "password": "abc",
                "email": email,
            }
        }

        # Act
        sut_response = api_client.post(sut_url, payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="weakpassuser").exists()

    def test_register_invalid_email_format_rejected(self, api_client, user_env):
        # Arrange
        cache.set("otp_registration_notanemail", "123456", 600)
        sut_url = user_env.user_list_url
        payload = {
            "otp": "123456",
            "user": {
                "username": "invalidemailuser",
                "password": "Password123!",
                "email": "notanemail",
            }
        }

        # Act
        sut_response = api_client.post(sut_url, payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_profile_picture_too_large_rejected(self, user_env):
        # Arrange
        from apps.user.serializers.user import UserSerializer
        from unittest.mock import patch, MagicMock
        large_content = b"x" * (5 * 1024 * 1024 + 1)
        pic = SimpleUploadedFile("photo.jpg", large_content, content_type="image/jpeg")

        mock_img = MagicMock()
        mock_img.format = "JPEG"
        mock_img.size = (100, 100)
        mock_img.verify = lambda: None
        mock_img.load = lambda: None
        mock_img.fp = pic
        mock_img.mode = "RGB"

        # Act & Assert
        with patch("PIL.Image.open", return_value=mock_img):
            sut_serializer = UserSerializer(
                user_env.owner_a,
                data={"profile_picture": pic},
                partial=True,
            )
            assert not sut_serializer.is_valid()
            assert "profile_picture" in sut_serializer.errors
            assert "5MB" in str(sut_serializer.errors["profile_picture"])

    def test_profile_picture_invalid_type_rejected(self, user_env):
        # Arrange
        from apps.user.serializers.user import UserSerializer
        gif = SimpleUploadedFile("anim.gif", b"GIF89a", content_type="image/gif")

        # Act
        sut_serializer = UserSerializer(
            user_env.owner_a,
            data={"profile_picture": gif},
            partial=True,
        )

        # Assert
        assert not sut_serializer.is_valid()
        assert "profile_picture" in sut_serializer.errors

    def test_deleted_user_still_exists_in_all_objects(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_url = reverse('user-detail', args=[user_env.employee_a1.id])

        # Act
        sut_response = api_client.delete(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(id=user_env.employee_a1.id).exists()
        deleted = User.all_objects.filter(id=user_env.employee_a1.id, is_deleted=True).first()
        assert deleted is not None
        assert deleted.is_active is False

    def test_deleted_user_cannot_login(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_del_url = reverse('user-detail', args=[user_env.employee_a1.id])
        api_client.delete(sut_del_url)
        api_client.logout()

        sut_login_url = reverse('user-login')

        # Act
        sut_response = api_client.post(sut_login_url, {
            "username": user_env.employee_a1.username,
            "password": "password123",
        })

        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_endpoint_returns_correct_role(self, api_client, user_env):
        # Arrange
        sut_me_url = reverse('user-me')

        # Act & Assert - Owner
        api_client.force_authenticate(user=user_env.owner_a)
        res_owner = api_client.get(sut_me_url)
        assert res_owner.status_code == status.HTTP_200_OK
        assert res_owner.data.get("role") == UserRole.OWNER

        # Act & Assert - Manager
        api_client.force_authenticate(user=user_env.manager_a1)
        res_manager = api_client.get(sut_me_url)
        assert res_manager.status_code == status.HTTP_200_OK
        assert res_manager.data.get("role") == UserRole.MANAGER

        # Act & Assert - Employee
        api_client.force_authenticate(user=user_env.employee_a1)
        res_emp = api_client.get(sut_me_url)
        assert res_emp.status_code == status.HTTP_200_OK
        assert res_emp.data.get("role") == UserRole.EMPLOYEE

    def test_update_response_includes_role(self, api_client, user_env):
        # Arrange
        api_client.force_authenticate(user=user_env.owner_a)
        sut_url = reverse('user-detail', args=[user_env.manager_a1.id])

        # Act
        sut_response = api_client.patch(sut_url, {"user": {"first_name": "RoleCheck"}}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "role" in sut_response.data
        assert sut_response.data["role"] == UserRole.MANAGER
