import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.cost.models import CostCategory
from apps.activity_log.models import ActivityLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.list_url = reverse('cost-category-list')
    return tc


@pytest.mark.django_db
class TestCostCategory:

    def test_cost_category_create_without_name(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        payload = {"description": "No name"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'name' in sut_response.data

    def test_cost_category_create_without_description(self, api_client, env):
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        payload = {"name": "Travel"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert sut_response.data['description'] is None

    def test_cost_category_crud_by_owner(self, api_client, env):
        # Arrange
        sut_list_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        create_payload = {"name": "Travel", "description": "Business trips"}

        # Act - Create
        sut_create_response = api_client.post(sut_list_url, create_payload)

        # Assert - Create
        assert sut_create_response.status_code == status.HTTP_201_CREATED
        category_id = sut_create_response.data['id']
        env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.COST)

        # Arrange - Read
        sut_detail_url = reverse('cost-category-detail', args=[category_id])

        # Act - Read
        sut_get_response = api_client.get(sut_detail_url)

        # Assert - Read
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert sut_get_response.data['name'] == "Travel"

        # Arrange - Update
        update_payload = {"name": "Travel & Transport"}

        # Act - Update
        sut_patch_response = api_client.patch(sut_detail_url, update_payload)

        # Assert - Update
        assert sut_patch_response.status_code == status.HTTP_200_OK
        assert CostCategory.objects.get(id=category_id).name == "Travel & Transport"
        log = env._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.COST)
        assert log.meta['name']['old'] == "Travel"

        # Act - Delete
        sut_delete_response = api_client.delete(sut_detail_url)

        # Assert - Delete
        assert sut_delete_response.status_code == status.HTTP_204_NO_CONTENT
        assert not CostCategory.objects.filter(id=category_id).exists()
        env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.COST)

    def test_cost_category_crud_by_manager(self, api_client, env):
        # Arrange
        sut_list_url = env.list_url
        api_client.force_authenticate(user=env.manager_a1)
        create_payload = {"name": "Office Supplies"}

        # Act - Create
        sut_create_response = api_client.post(sut_list_url, create_payload)

        # Assert - Create
        assert sut_create_response.status_code == status.HTTP_201_CREATED
        category_id = sut_create_response.data['id']

        # Arrange - Update
        sut_detail_url = reverse('cost-category-detail', args=[category_id])
        update_payload = {"name": "Stationery"}

        # Act - Update
        sut_patch_response = api_client.patch(sut_detail_url, update_payload)

        # Assert - Update
        assert sut_patch_response.status_code == status.HTTP_200_OK

        # Act - Delete
        sut_delete_response = api_client.delete(sut_detail_url)

        # Assert - Delete
        assert sut_delete_response.status_code == status.HTTP_204_NO_CONTENT

    def test_cost_category_crud_by_employee(self, api_client, env):
        # Arrange
        sut_list_url = env.list_url
        sut_detail_url = reverse('cost-category-detail', args=[env.cost_category_a.id])
        api_client.force_authenticate(user=env.employee_a1)

        # Act & Assert - 1. Create
        sut_post_res = api_client.post(sut_list_url, {"name": "Lunch"})
        assert sut_post_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 2. Read
        sut_get_res = api_client.get(sut_detail_url)
        assert sut_get_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 3. Update
        sut_patch_res = api_client.patch(sut_detail_url, {"name": "Hacked"})
        assert sut_patch_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 4. Delete
        sut_del_res = api_client.delete(sut_detail_url)
        assert sut_del_res.status_code == status.HTTP_403_FORBIDDEN

    def test_cost_category_crud_by_owner_other_business(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_b)
        sut_list_url = env.list_url
        sut_biz_a_detail_url = reverse('cost-category-detail', args=[env.cost_category_a.id])

        # Act & Assert - 1. Create (tied to own business)
        sut_create_res = api_client.post(sut_list_url, {"name": "Biz B Category"})
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        assert sut_create_res.data['business'] == env.business_b.id

        # Act & Assert - 2. Read Biz A Category
        sut_get_res = api_client.get(sut_biz_a_detail_url)
        assert sut_get_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 3. Update Biz A Category
        sut_patch_res = api_client.patch(sut_biz_a_detail_url, {"name": "Hacked"})
        assert sut_patch_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 4. Delete Biz A Category
        sut_del_res = api_client.delete(sut_biz_a_detail_url)
        assert sut_del_res.status_code == status.HTTP_404_NOT_FOUND

    def test_cost_category_crud_by_manager_other_business(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.manager_b1)
        sut_list_url = env.list_url
        sut_biz_a_detail_url = reverse('cost-category-detail', args=[env.cost_category_a.id])

        # Act & Assert - 1. Create
        sut_create_res = api_client.post(sut_list_url, {"name": "Biz B Manager Category"})
        assert sut_create_res.status_code == status.HTTP_201_CREATED

        # Act & Assert - 2. Read Biz A Category
        sut_get_res = api_client.get(sut_biz_a_detail_url)
        assert sut_get_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 3. Update Biz A Category
        sut_patch_res = api_client.patch(sut_biz_a_detail_url, {"name": "Hacked"})
        assert sut_patch_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 4. Delete Biz A Category
        sut_del_res = api_client.delete(sut_biz_a_detail_url)
        assert sut_del_res.status_code == status.HTTP_404_NOT_FOUND

    def test_cost_category_crud_by_employee_other_business(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.employee_b1)
        sut_list_url = env.list_url
        sut_biz_a_detail_url = reverse('cost-category-detail', args=[env.cost_category_a.id])

        # Act & Assert - 1. Create
        sut_create_res = api_client.post(sut_list_url, {"name": "Biz B Employee Category"})
        assert sut_create_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 2. Read
        sut_get_res = api_client.get(sut_biz_a_detail_url)
        assert sut_get_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 3. Update
        sut_patch_res = api_client.patch(sut_biz_a_detail_url, {"name": "Hacked"})
        assert sut_patch_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 4. Delete
        sut_del_res = api_client.delete(sut_biz_a_detail_url)
        assert sut_del_res.status_code == status.HTTP_403_FORBIDDEN