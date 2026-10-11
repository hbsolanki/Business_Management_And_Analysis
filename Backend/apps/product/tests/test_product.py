import pytest
from rest_framework import status
from django.urls import reverse
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.product.models import Product, ProductCategory
from apps.employee.models import WorkType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def product_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.product_a = tc.product_a1
    tc.product_b = tc.product_b1
    tc.url_a = reverse("product-detail", args=[tc.product_a.id])
    tc.url_b = reverse("product-detail", args=[tc.product_b.id])
    tc.list_url = reverse("product-list")
    tc.category_list_url = reverse("product-category-list")
    return tc


@pytest.mark.django_db
class TestProduct:

    def test_create_product_missing_data(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_url = product_env.list_url
        payload = {"name": "No SKU", "base_price": 100}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_crud_operation_on_product_by_owner(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_list_url = product_env.list_url

        # Act - List
        sut_res_list = api_client.get(sut_list_url)

        # Assert - List
        assert sut_res_list.status_code == status.HTTP_200_OK
        product_ids = [p["id"] for p in sut_res_list.data.get("results", [])]
        assert product_env.product_a.id in product_ids
        assert product_env.product_b.id not in product_ids

        # Arrange - Update
        sut_detail_url = product_env.url_a
        original_sku = product_env.product_a.sku
        update_payload = {"name": "New Name Owner"}

        # Act - Update
        sut_patch_res = api_client.patch(sut_detail_url, update_payload)

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK
        product_env.product_a.refresh_from_db()
        assert product_env.product_a.name == update_payload["name"]
        assert product_env.product_a.sku == original_sku

        # Act - Delete
        sut_delete_res = api_client.delete(sut_detail_url)

        # Assert - Delete
        assert sut_delete_res.status_code == status.HTTP_204_NO_CONTENT
        product_env.product_a.refresh_from_db()
        assert product_env.product_a.is_active is False

    def test_crud_operation_on_product_by_manager(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.manager_a1)
        sut_list_url = product_env.list_url
        sut_detail_url = product_env.url_a

        # Act - List
        sut_res_list = api_client.get(sut_list_url)

        # Assert - List
        product_ids = [p["id"] for p in sut_res_list.data.get("results", [])]
        assert product_env.product_a.id in product_ids
        assert product_env.product_b.id not in product_ids

        # Act - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"name": "New Name Mgr"})

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK

    def test_crud_operation_on_product_by_employee_without_permission(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.employee_a1)
        sut_list_url = product_env.list_url
        sut_detail_url = product_env.url_a

        # Act & Assert
        assert api_client.get(sut_list_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_crud_operation_on_product_by_employee_with_permission(self, api_client, product_env):
        # Arrange
        product_env.assign_work_to_user(product_env.employee_a1, product_env.branch_a1, WorkType.PRODUCT)
        api_client.force_authenticate(user=product_env.employee_a1)
        sut_list_url = product_env.list_url
        sut_detail_url = product_env.url_a

        # Act & Assert - List
        sut_res_list = api_client.get(sut_list_url)
        assert sut_res_list.status_code == status.HTTP_200_OK

        # Act & Assert - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"name": "Emp Update"})
        assert sut_patch_res.status_code == status.HTTP_200_OK

    def test_isolation_owner_cannot_access_other_business_product(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_url_b = product_env.url_b

        # Act & Assert
        assert api_client.get(sut_url_b).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_url_b, {"name": "X"}).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_url_b).status_code == status.HTTP_404_NOT_FOUND

    def test_sku_uniqueness_per_business(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_list_url = product_env.list_url
        duplicate_data = {
            "name": "Dup SKU",
            "sku": product_env.product_a.sku,
            "base_price": 10,
            "cost_price": 5,
            "input_gst_rate": 0,
            "output_gst_rate": 0,
        }

        # Act
        sut_response = api_client.post(sut_list_url, duplicate_data)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sku" in sut_response.data

    def test_price_decimal_constraints(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_list_url = product_env.list_url
        huge_price_data = {
            "name": "Huge Price",
            "sku": "HUGE-1",
            "base_price": "123456789012.00",
            "cost_price": 10,
            "input_gst_rate": 0,
            "output_gst_rate": 0,
        }

        # Act
        sut_response = api_client.post(sut_list_url, huge_price_data)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_gst_decimal_constraints(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_list_url = product_env.list_url
        high_gst_data = {
            "name": "High GST",
            "sku": "GST-1",
            "base_price": 100,
            "cost_price": 50,
            "input_gst_rate": "1000.00",
            "output_gst_rate": 18,
        }

        # Act
        sut_response = api_client.post(sut_list_url, high_gst_data)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_net_profit_calculation(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_list_url = product_env.list_url
        product_data = {
            "name": "ProfitTest",
            "sku": "PF-REFACK",
            "base_price": 150.00,
            "cost_price": 100.00,
            "input_gst_rate": 0,
            "output_gst_rate": 0,
        }

        # Act
        sut_response = api_client.post(sut_list_url, product_data)

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        product = Product.objects.get(sku=product_data["sku"])
        expected_profit = float(product_data["base_price"]) - float(product_data["cost_price"])
        assert float(product.net_profit) == expected_profit

        # Category CRUD sub-flow
        sut_cat_url = product_env.category_list_url
        cat_data = {"name": "New Cat", "description": "Desc"}
        res_cat_create = api_client.post(sut_cat_url, cat_data)
        assert res_cat_create.status_code == status.HTTP_201_CREATED
        cat_id = res_cat_create.data["id"]

        res_cat_list = api_client.get(sut_cat_url)
        expected_count = ProductCategory.objects.filter(business=product_env.owner_a.business).count()
        assert len(res_cat_list.data["results"]) == expected_count

        detail_cat_url = reverse("product-category-detail", args=[cat_id])
        update_data = {"name": "Updated Cat"}
        api_client.patch(detail_cat_url, update_data)
        assert ProductCategory.objects.get(id=cat_id).name == update_data["name"]

        api_client.delete(detail_cat_url)
        assert ProductCategory.all_objects.get(id=cat_id).is_active is False

    def test_product_filtering_combinations(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        sut_list_url = product_env.list_url

        # Act & Assert - 1. Filter by Name (icontains)
        search_name = "Product"
        res1 = api_client.get(f"{sut_list_url}?name={search_name}")
        expected_count = Product.objects.filter(business=product_env.owner_a.business, name__icontains=search_name).count()
        assert len(res1.data["results"]) == expected_count
        assert res1.data["results"][0]["name"] == "Product A2"
        assert res1.data["results"][1]["name"] == "Product A1"

        # Act & Assert - 2. Filter by Name Case-Insensitive (icontains)
        search_name_lower = "product a1"
        res2 = api_client.get(f"{sut_list_url}?name={search_name_lower}")
        expected_count2 = Product.objects.filter(business=product_env.owner_a.business, name__icontains=search_name_lower).count()
        assert len(res2.data["results"]) == expected_count2
        assert res2.data["results"][0]["id"] == product_env.product_a1.id

        # Act & Assert - 3. Filter by SKU (icontains)
        search_sku = "A2"
        res3 = api_client.get(f"{sut_list_url}?sku={search_sku}")
        expected_count3 = Product.objects.filter(business=product_env.owner_a.business, sku__icontains=search_sku).count()
        assert len(res3.data["results"]) == expected_count3
        assert res3.data["results"][0]["sku"] == "PRD-A2"

        # Act & Assert - 4. Filter by Category (exact)
        res4 = api_client.get(f"{sut_list_url}?product_category={product_env.category_a.id}")
        expected_count4 = Product.objects.filter(business=product_env.owner_a.business, product_category=product_env.category_a).count()
        assert len(res4.data["results"]) == expected_count4

        # Act & Assert - 5. Filter by Name AND Category
        res5 = api_client.get(f"{sut_list_url}?name=A1&product_category={product_env.category_a.id}")
        assert len(res5.data["results"]) == 1
        assert res5.data["results"][0]["sku"] == "PRD-A1"

        # Act & Assert - 6. Filter by SKU AND Category
        res6 = api_client.get(f"{sut_list_url}?sku=PRD-A2&product_category={product_env.category_a.id}")
        assert len(res6.data["results"]) == 1
        assert res6.data["results"][0]["name"] == "Product A2"

        # Act & Assert - 7. Filter by Name AND SKU
        res7 = api_client.get(f"{sut_list_url}?name=Product&sku=A1")
        assert len(res7.data["results"]) == 1
        assert res7.data["results"][0]["id"] == product_env.product_a1.id

        # Act & Assert - 8. All Filters Combined
        res8 = api_client.get(f"{sut_list_url}?name=Product&sku=PRD&product_category={product_env.category_a.id}")
        assert len(res8.data["results"]) == 2

        # Act & Assert - 9. Filter with No Results
        res9 = api_client.get(f"{sut_list_url}?name=NonExistentProduct")
        assert len(res9.data["results"]) == 0

    def test_product_pagination(self, api_client, product_env):
        # Arrange
        api_client.force_authenticate(user=product_env.owner_a)
        for i in range(5):
            Product.objects.create(
                business=product_env.business_a,
                name=f"Paginated Product {i}",
                sku=f"PG-SKU-{i}",
                base_price=100.00,
                cost_price=50.00,
                input_gst_rate=18.00,
                output_gst_rate=18.00,
                product_category=product_env.category_a,
            )
        sut_list_url = product_env.list_url

        # Act - Page 1
        sut_page1_res = api_client.get(sut_list_url)

        # Assert - Page 1
        assert sut_page1_res.status_code == status.HTTP_200_OK
        assert len(sut_page1_res.data["results"]) == 6
        assert sut_page1_res.data["next"] is not None

        # Act - Page 2
        sut_page2_res = api_client.get(sut_page1_res.data["next"])

        # Assert - Page 2
        assert sut_page2_res.status_code == status.HTTP_200_OK
        assert len(sut_page2_res.data["results"]) == 1
        assert sut_page2_res.data["next"] is None
