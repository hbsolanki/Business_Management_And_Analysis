import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.supplier.models import Supplier
from apps.activity_log.models import ActivityLog
from apps.employee.models import WorkType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def supplier_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.url = reverse('supplier-list')
    tc.supplier_data = {
        "name": "Supplier New",
        "mobile_number": "9999999999",
        "email": "new@example.com",
        "contact_person": "Contact New",
        "gst_number": "27AAAAA0000A1Z5",
        "address": "456 Avenue",
        "same_platform": False
    }
    return tc


def verify_supplier_data(response_data, expected_data):
    for key, value in expected_data.items():
        assert response_data[key] == value


@pytest.mark.django_db
class TestSupplier:

    def test_supplier_crud_by_owner(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_list_url = supplier_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_list_url, supplier_env.supplier_data, format='json')

        # Assert - Create
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        verify_supplier_data(sut_create_res.data, supplier_env.supplier_data)
        supplier_id = sut_create_res.data['id']
        supplier_env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.SUPPLIER)

        # Act - List
        sut_list_res = api_client.get(sut_list_url)

        # Assert - List
        assert sut_list_res.status_code == status.HTTP_200_OK
        assert len(sut_list_res.data['results']) == Supplier.objects.filter(business=supplier_env.owner_a.business).count()

        # Arrange - Read & Update
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_id})

        # Act - Read
        sut_read_res = api_client.get(sut_detail_url)

        # Assert - Read
        assert sut_read_res.status_code == status.HTTP_200_OK
        verify_supplier_data(sut_read_res.data, supplier_env.supplier_data)

        # Act - Update
        update_data = {"name": "Updated"}
        sut_patch_res = api_client.patch(sut_detail_url, update_data, format='json')

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK
        log = supplier_env._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.SUPPLIER)
        assert log.meta['name']['old'] == supplier_env.supplier_data["name"]

        # Act & Assert - Read after update
        assert api_client.get(sut_detail_url).data['name'] == update_data["name"]

        # Act - Delete
        sut_del_res = api_client.delete(sut_detail_url)

        # Assert - Delete
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT
        supplier_env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.SUPPLIER)

    def test_supplier_crud_by_manager(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.manager_a1)
        sut_list_url = supplier_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_list_url, supplier_env.supplier_data, format='json')

        # Assert - Create
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        verify_supplier_data(sut_create_res.data, supplier_env.supplier_data)
        supplier_id = sut_create_res.data['id']

        # Act & Assert - List
        assert api_client.get(sut_list_url).status_code == status.HTTP_200_OK

        # Arrange & Act - Read
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_id})
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK

        # Act - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"name": "Updated"}, format='json')
        assert sut_patch_res.status_code == status.HTTP_200_OK
        assert api_client.get(sut_detail_url).data['name'] == "Updated"

        # Act - Delete
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT

    def test_supplier_crud_by_employee_without_permission(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.employee_a1)
        sut_list_url = supplier_env.url
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})

        # Act & Assert
        assert api_client.post(sut_list_url, supplier_env.supplier_data, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(sut_list_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(sut_detail_url, {"name": "Updated"}, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_supplier_crud_by_employee_with_permission(self, api_client, supplier_env):
        # Arrange
        supplier_env.assign_work_to_user(supplier_env.employee_a1, supplier_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=supplier_env.employee_a1)
        sut_list_url = supplier_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_list_url, supplier_env.supplier_data, format='json')
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        supplier_id = sut_create_res.data['id']

        # Act & Assert - List
        assert api_client.get(sut_list_url).status_code == status.HTTP_200_OK

        # Act & Assert - Read, Update, Delete
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_id})
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK
        assert api_client.patch(sut_detail_url, {"name": "Updated"}, format='json').status_code == status.HTTP_200_OK
        assert api_client.get(sut_detail_url).data['name'] == "Updated"
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT

    def test_supplier_crud_by_owner_other_business(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_b)
        sut_list_url = supplier_env.url
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})

        # Act & Assert - List
        res_list = api_client.get(sut_list_url)
        assert res_list.status_code == status.HTTP_200_OK
        assert len(res_list.data['results']) == 2

        # Act & Assert - Read, Update, Delete Biz A
        assert api_client.get(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_detail_url, {"name": "Updated"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_supplier_crud_by_manager_other_business(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.manager_a1)
        sut_list_url = supplier_env.url
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_b1.id})

        # Act & Assert
        assert api_client.get(sut_list_url).status_code == status.HTTP_200_OK
        assert api_client.get(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_detail_url, {"name": "Updated"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_supplier_crud_by_employee_without_permission_other_business(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.employee_b1)
        sut_list_url = supplier_env.url
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})

        # Act & Assert
        assert api_client.post(sut_list_url, supplier_env.supplier_data, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(sut_detail_url, {"name": "Updated"}, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_supplier_crud_by_employee_with_permission_other_business(self, api_client, supplier_env):
        # Arrange
        supplier_env.assign_work_to_user(supplier_env.employee_a1, supplier_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=supplier_env.employee_a1)
        sut_list_url = supplier_env.url
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_b1.id})

        # Act & Assert
        assert api_client.get(sut_list_url).status_code == status.HTTP_200_OK
        assert api_client.get(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_detail_url, {"name": "Updated"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_supplier_validation_error_same_platform(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})
        payload = supplier_env.supplier_data.copy()
        payload['same_platform'] = True
        payload['supplier_business_id'] = None

        # Act & Assert
        assert api_client.post(supplier_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.patch(sut_detail_url, {"same_platform": True, "supplier_business_id": None}, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_supplier_validation_error_different_platform(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})
        payload = supplier_env.supplier_data.copy()
        payload['same_platform'] = False
        payload['supplier_business_id'] = supplier_env.business_b.id

        # Act & Assert
        assert api_client.post(supplier_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.patch(sut_detail_url, {"same_platform": False, "supplier_business_id": supplier_env.business_b.id}, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_supplier_validation_error_invalid_gst(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})
        payload = supplier_env.supplier_data.copy()
        payload['gst_number'] = "INVALID_GST"

        # Act & Assert
        assert api_client.post(supplier_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.patch(sut_detail_url, {"gst_number": "INVALID_GST"}, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_supplier_validation_error_invalid_mobile(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})
        payload = supplier_env.supplier_data.copy()
        payload['mobile_number'] = "98765"

        # Act & Assert
        assert api_client.post(supplier_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.patch(sut_detail_url, {"mobile_number": "98765"}, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_supplier_validation_error_invalid_email(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_detail_url = reverse('supplier-detail', kwargs={'pk': supplier_env.supplier_a1.id})
        payload = supplier_env.supplier_data.copy()
        payload['email'] = "invalid-email"

        # Act & Assert
        assert api_client.post(supplier_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.patch(sut_detail_url, {"email": "invalid-email"}, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_supplier_filtering_combinations(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        sut_url = supplier_env.url

        # Act & Assert - 1. Name icontains
        res1 = api_client.get(f"{sut_url}?name=Supp")
        assert len(res1.data["results"]) == 2

        # Act & Assert - 2. Name Case-Insensitive
        res2 = api_client.get(f"{sut_url}?name=supplier a1")
        assert len(res2.data["results"]) == 1
        assert res2.data["results"][0]["id"] == supplier_env.supplier_a1.id

        # Act & Assert - 3. Mobile icontains
        res3 = api_client.get(f"{sut_url}?mobile_number=0003")
        assert len(res3.data["results"]) == 1
        assert res3.data["results"][0]["id"] == supplier_env.supplier_a2.id

        # Act & Assert - 4. Mobile full match
        res4 = api_client.get(f"{sut_url}?mobile_number=9000000001")
        assert len(res4.data["results"]) == 1
        assert res4.data["results"][0]["id"] == supplier_env.supplier_a1.id

        # Act & Assert - 5. Name AND Mobile
        res5 = api_client.get(f"{sut_url}?name=A1&mobile_number=0001")
        assert len(res5.data["results"]) == 1
        assert res5.data["results"][0]["name"] == "Supplier A1"

        # Act & Assert - 6. Name AND Mobile (Mismatch)
        res6 = api_client.get(f"{sut_url}?name=A1&mobile_number=3211")
        assert len(res6.data["results"]) == 0

        # Act & Assert - 7. Empty results
        res7 = api_client.get(f"{sut_url}?name=NonExistent")
        assert len(res7.data["results"]) == 0

        # Act & Assert - 8. All filters combined
        res8 = api_client.get(f"{sut_url}?name=Supplier&mobile_number=9000")
        assert len(res8.data["results"]) == 2

    def test_supplier_pagination(self, api_client, supplier_env):
        # Arrange
        api_client.force_authenticate(user=supplier_env.owner_a)
        for i in range(5):
            Supplier.objects.create(
                business=supplier_env.business_a,
                name=f"Paginated Supplier {i}",
                mobile_number=f"700000000{i}"
            )
        sut_url = supplier_env.url

        # Act - Page 1
        res_page1 = api_client.get(sut_url)
        assert res_page1.status_code == 200
        assert len(res_page1.data["results"]) == 6
        assert res_page1.data["next"] is not None

        # Act - Page 2
        res_page2 = api_client.get(res_page1.data["next"])
        assert res_page2.status_code == 200
        assert len(res_page2.data["results"]) == 1
        assert res_page2.data["next"] is None