import pytest
from rest_framework import status
from django.urls import reverse
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.product.models import ProductCategory
from apps.activity_log.models import ActivityLog
from apps.business.models import Business, Branch
from apps.employee.models import UserBranchWork, WorkType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def category_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.business = Business.objects.create(name="Tech Store Business")
    tc.other_business = Business.objects.create(name="Other Business")
    tc.list_url = reverse("product-category-list")
    return tc


@pytest.mark.django_db
class TestProductCategory:

    def test_owner_can_create_category(self, api_client, category_env):
        # Arrange
        owner = category_env.create_owner(username="owner", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner)
        sut_url = category_env.list_url
        payload = {"name": "Electronics", "description": "Electronic gadgets"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        category = ProductCategory.objects.get(name="Electronics")
        assert category.business == category_env.business
        assert category.description == "Electronic gadgets"

    def test_duplicate_category_name_per_business(self, api_client, category_env):
        # Arrange
        owner = category_env.create_owner(username="owner", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner)
        sut_url = category_env.list_url

        # Act - 1. First creation
        res1 = api_client.post(sut_url, {"name": "Mobiles", "description": "Phones"})
        assert ProductCategory.objects.filter(name="Mobiles", business=category_env.business).count() == 1

        # Act - 2. Duplicate in same business
        sut_response_duplicate = api_client.post(sut_url, {"name": "Mobiles", "description": "Duplicate"})

        # Assert - 2
        assert sut_response_duplicate.status_code == status.HTTP_400_BAD_REQUEST
        assert ProductCategory.objects.filter(name="Mobiles", business=category_env.business).count() == 1

        # Arrange & Act - 3. Cross-tenant isolation
        owner2 = category_env.create_owner(username="owner2", business=category_env.other_business, authenticate=False)
        api_client.force_authenticate(user=owner2)
        sut_response_other_biz = api_client.post(sut_url, {"name": "Mobiles", "description": "Phones"})

        # Assert - 3
        assert sut_response_other_biz.status_code == status.HTTP_201_CREATED
        assert ProductCategory.objects.filter(name="Mobiles", business=category_env.other_business).count() == 1

    def test_create_category_missing_name(self, api_client, category_env):
        # Arrange
        owner = category_env.create_owner(username="owner", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner)
        sut_url = category_env.list_url
        payload = {"description": "No name provided"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in sut_response.data

    def test_create_category_missing_description(self, api_client, category_env):
        # Arrange
        owner = category_env.create_owner(username="owner", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner)
        sut_url = category_env.list_url
        payload = {"name": "No Description Category"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "description" in sut_response.data

    def test_create_category_unauthenticated(self, api_client, category_env):
        # Arrange
        sut_url = category_env.list_url
        payload = {"name": "Electronics", "description": "Electronic gadgets"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED
        assert not ProductCategory.objects.filter(name="Electronics").exists()

    def test_listing_categories_is_filtered_by_business(self, api_client, category_env):
        # Arrange
        ProductCategory.objects.create(name="Phones A", business=category_env.business)
        ProductCategory.objects.create(name="Tablets A", business=category_env.business)
        ProductCategory.objects.create(name="Phones B", business=category_env.other_business)
        owner = category_env.create_owner(username="owner", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner)
        sut_url = category_env.list_url

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert len(sut_response.data["results"]) == 2
        names = [item["name"] for item in sut_response.data["results"]]
        assert "Phones A" in names
        assert "Phones B" not in names

    def test_unauthenticated_requests_rejected(self, api_client, category_env):
        # Arrange
        sut_url = category_env.list_url

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_owner_can_crud_category(self, api_client, category_env):
        # Arrange
        owner = category_env.create_owner(username="owner_crud", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner)
        sut_list_url = category_env.list_url

        # Act - CREATE
        res_create = api_client.post(sut_list_url, {"name": "Owner Items", "description": "Tests"})
        assert res_create.status_code == status.HTTP_201_CREATED
        category_id = res_create.data.get("id", ProductCategory.objects.get(name="Owner Items").id)
        sut_detail_url = reverse("product-category-detail", args=[category_id])
        category_env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.PRODUCT)

        # Act & Assert - READ
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK

        # Act & Assert - UPDATE
        res_update = api_client.patch(sut_detail_url, {"description": "Updated"})
        assert res_update.status_code == status.HTTP_200_OK
        log = category_env._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.PRODUCT)
        assert log.meta["description"]["old"] == "Tests"

        # Act & Assert - DELETE
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT
        category_env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.PRODUCT)

    def test_manager_can_crud_category(self, api_client, category_env):
        # Arrange
        manager = category_env.create_manager(username="manager_crud", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=manager)
        sut_list_url = category_env.list_url

        # Act & Assert - CREATE
        res_create = api_client.post(sut_list_url, {"name": "Manager Items", "description": "Tests"})
        assert res_create.status_code == status.HTTP_201_CREATED
        category_id = res_create.data.get("id", ProductCategory.objects.get(name="Manager Items").id)
        sut_detail_url = reverse("product-category-detail", args=[category_id])

        # Act & Assert - READ
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK

        # Act & Assert - UPDATE
        assert api_client.patch(sut_detail_url, {"description": "Updated"}).status_code == status.HTTP_200_OK

        # Act & Assert - DELETE
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT

    def test_employee_with_product_permission_can_crud_category(self, api_client, category_env):
        # Arrange
        emp = category_env.create_employee(username="emp_perm_crud", business=category_env.business, authenticate=False)
        branch = Branch.objects.create(name="CRUD Branch", business=category_env.business)
        UserBranchWork.objects.create(user=emp, branch=branch, work_type=WorkType.PRODUCT)
        api_client.force_authenticate(user=emp)
        sut_list_url = category_env.list_url

        # Act & Assert - CREATE
        res_create = api_client.post(sut_list_url, {"name": "Employee Items", "description": "Tests"})
        assert res_create.status_code == status.HTTP_201_CREATED
        category_id = res_create.data.get("id", ProductCategory.objects.get(name="Employee Items").id)
        sut_detail_url = reverse("product-category-detail", args=[category_id])

        # Act & Assert - READ
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK

        # Act & Assert - UPDATE
        assert api_client.patch(sut_detail_url, {"description": "Updated"}).status_code == status.HTTP_200_OK

        # Act & Assert - DELETE
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT

    def test_employee_without_product_permission_cannot_crud(self, api_client, category_env):
        # Arrange
        emp = category_env.create_employee(username="emp_no_perm", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=emp)
        sut_list_url = category_env.list_url

        # Act & Assert - CREATE
        assert api_client.post(sut_list_url, {"name": "Test", "description": "Test"}).status_code == status.HTTP_403_FORBIDDEN

        category = ProductCategory.objects.create(name="Existing", description="Test", business=category_env.business)
        sut_detail_url = reverse("product-category-detail", args=[category.id])

        # Act & Assert - READ, UPDATE, DELETE
        assert api_client.get(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(sut_detail_url, {"description": "Updated"}).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_users_cannot_access_other_business_categories(self, api_client, category_env):
        # Arrange
        category_b = ProductCategory.objects.create(name="Category B", description="B", business=category_env.other_business)
        sut_url_b = reverse("product-category-detail", args=[category_b.id])

        # 1. Owner of Business A trying to CRUD on Business B
        owner_a = category_env.create_owner(username="owner_a", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=owner_a)
        assert api_client.get(sut_url_b).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_url_b, {"description": "Hacked"}).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_url_b).status_code == status.HTTP_404_NOT_FOUND

        # 2. Manager of Business A trying to CRUD on Business B
        manager_a = category_env.create_manager(username="manager_a", business=category_env.business, authenticate=False)
        api_client.force_authenticate(user=manager_a)
        assert api_client.get(sut_url_b).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_url_b, {"description": "Hacked"}).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_url_b).status_code == status.HTTP_404_NOT_FOUND

        # 3. Employee of Business A WITH product permission trying to CRUD on Business B
        emp_a = category_env.create_employee(username="emp_a_perm", business=category_env.business, authenticate=False)
        branch_a = Branch.objects.create(name="Branch A", business=category_env.business)
        UserBranchWork.objects.create(user=emp_a, branch=branch_a, work_type=WorkType.PRODUCT)
        api_client.force_authenticate(user=emp_a)
        assert api_client.get(sut_url_b).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_url_b, {"description": "Hacked"}).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_url_b).status_code == status.HTTP_404_NOT_FOUND
