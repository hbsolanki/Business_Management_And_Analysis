from rest_framework import status
from django.urls import reverse
from apps.base.tests import BaseTestCase
from apps.product.models import ProductCategory
from apps.activity_log.models import ActivityLog
from apps.business.models import Business, Branch
from apps.employee.models import UserBranchWork, WorkType


class ProductCategoryTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.business = Business.objects.create(name="Tech Store Business")
        self.other_business = Business.objects.create(name="Other Business")

        self.list_url = reverse("product-category-list")

    # Create Tests

    def test_owner_can_create_category(self):
        self.create_owner(username="owner", business=self.business, authenticate=True)
        data = {"name": "Electronics", "description": "Electronic gadgets"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify it was saved correctly in DB
        category = ProductCategory.objects.get(name="Electronics")
        self.assertEqual(category.business, self.business)
        self.assertEqual(category.description, "Electronic gadgets")

    def test_duplicate_category_name_per_business(self):
        self.create_owner(username="owner", business=self.business, authenticate=True)

        # First creation succeeds
        self.client.post(self.list_url, {"name": "Mobiles", "description": "Phones"})
        self.assertEqual(
            ProductCategory.objects.filter(
                name="Mobiles", business=self.business
            ).count(),
            1,
        )

        # Second creation fails due to constraint
        response = self.client.post(
            self.list_url, {"name": "Mobiles", "description": "Duplicate"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify the database rigorously blocked the duplicate
        self.assertEqual(
            ProductCategory.objects.filter(
                name="Mobiles", business=self.business
            ).count(),
            1,
        )

        # Verify cross-tenant isolation (Different business CAN use the same category name)
        self.create_owner(
            username="owner2", business=self.other_business, authenticate=True
        )
        response2 = self.client.post(
            self.list_url, {"name": "Mobiles", "description": "Phones"}
        )
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            ProductCategory.objects.filter(
                name="Mobiles", business=self.other_business
            ).count(),
            1,
        )

    def test_create_category_missing_name(self):
        self.create_owner(username="owner", business=self.business, authenticate=True)
        response = self.client.post(self.list_url, {"description": "No name provided"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_category_missing_description(self):
        self.create_owner(username="owner", business=self.business, authenticate=True)
        response = self.client.post(self.list_url, {"name": "No Description Category"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", response.data)

    def test_create_category_unauthenticated(self):
        data = {"name": "Electronics", "description": "Electronic gadgets"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(ProductCategory.objects.filter(name="Electronics").exists())

    # Read Tests

    def test_listing_categories_is_filtered_by_business(self):
        # Create categories for Business A
        ProductCategory.objects.create(name="Phones A", business=self.business)
        ProductCategory.objects.create(name="Tablets A", business=self.business)

        # Create categories for Business B
        ProductCategory.objects.create(name="Phones B", business=self.other_business)

        self.create_owner(username="owner", business=self.business, authenticate=True)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Phones A", names)
        self.assertNotIn("Phones B", names)

    def test_unauthenticated_requests_rejected(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # CRUD Tests

    def test_owner_can_crud_category(self):
        self.create_owner(
            username="owner_crud", business=self.business, authenticate=True
        )

        # CREATE
        res_create = self.client.post(
            self.list_url, {"name": "Owner Items", "description": "Tests"}
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        category_id = res_create.data.get(
            "id", ProductCategory.objects.get(name="Owner Items").id
        )
        url = reverse("product-category-detail", args=[category_id])
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.PRODUCT)

        # READ
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

        # UPDATE
        res = self.client.patch(url, {"description": "Updated"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.PRODUCT)
        self.assertEqual(log.meta["description"]["old"], "Tests")

        # DELETE
        self.assertEqual(
            self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT
        )
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.PRODUCT)

    def test_manager_can_crud_category(self):
        self.create_manager(
            username="manager_crud", business=self.business, authenticate=True
        )

        # CREATE
        res_create = self.client.post(
            self.list_url, {"name": "Manager Items", "description": "Tests"}
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        category_id = res_create.data.get(
            "id", ProductCategory.objects.get(name="Manager Items").id
        )
        url = reverse("product-category-detail", args=[category_id])

        # READ
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

        # UPDATE
        self.assertEqual(
            self.client.patch(url, {"description": "Updated"}).status_code,
            status.HTTP_200_OK,
        )

        # DELETE
        self.assertEqual(
            self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT
        )

    def test_employee_with_product_permission_can_crud_category(self):
        # Give Employee precisely 'PRODUCT' permission on Branch 1
        emp = self.create_employee(
            username="emp_perm_crud", business=self.business, authenticate=True
        )
        branch = Branch.objects.create(name="CRUD Branch", business=self.business)
        UserBranchWork.objects.create(
            user=emp, branch=branch, work_type=WorkType.PRODUCT
        )

        # CREATE
        res_create = self.client.post(
            self.list_url, {"name": "Employee Items", "description": "Tests"}
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        category_id = res_create.data.get(
            "id", ProductCategory.objects.get(name="Employee Items").id
        )
        url = reverse("product-category-detail", args=[category_id])

        # READ
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

        # UPDATE
        self.assertEqual(
            self.client.patch(url, {"description": "Updated"}).status_code,
            status.HTTP_200_OK,
        )

        # DELETE
        self.assertEqual(
            self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT
        )

    # Role & Permission Constraint Tests

    def test_employee_without_product_permission_cannot_crud(self):
        self.create_employee(
            username="emp_no_perm", business=self.business, authenticate=True
        )

        # CREATE
        response = self.client.post(
            self.list_url, {"name": "Test", "description": "Test"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        category = ProductCategory.objects.create(
            name="Existing", description="Test", business=self.business
        )
        url = reverse("product-category-detail", args=[category.id])

        # READ
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # UPDATE
        response = self.client.patch(url, {"description": "Updated"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # DELETE
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_users_cannot_access_other_business_categories(self):
        # Create categories in Business B
        category_b = ProductCategory.objects.create(
            name="Category B", description="B", business=self.other_business
        )
        url_b = reverse("product-category-detail", args=[category_b.id])

        # 1. Owner of Business A trying to CRUD on Business B
        self.create_owner(username="owner_a", business=self.business, authenticate=True)
        self.assertEqual(self.client.get(url_b).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(url_b, {"description": "Hacked"}).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(url_b).status_code, status.HTTP_404_NOT_FOUND
        )

        # 2. Manager of Business A trying to CRUD on Business B
        self.create_manager(
            username="manager_a", business=self.business, authenticate=True
        )
        self.assertEqual(self.client.get(url_b).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(url_b, {"description": "Hacked"}).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(url_b).status_code, status.HTTP_404_NOT_FOUND
        )

        # 3. Employee of Business A WITH product permission trying to CRUD on Business B
        emp_a = self.create_employee(
            username="emp_a_perm", business=self.business, authenticate=True
        )
        branch_a = Branch.objects.create(name="Branch A", business=self.business)
        UserBranchWork.objects.create(
            user=emp_a, branch=branch_a, work_type=WorkType.PRODUCT
        )

        self.assertEqual(self.client.get(url_b).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(url_b, {"description": "Hacked"}).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(url_b).status_code, status.HTTP_404_NOT_FOUND
        )
