from rest_framework import status
from django.urls import reverse, reverse_lazy
from apps.base.tests import BaseTestCase
from apps.product.models import Product, ProductCategory
from apps.employee.models import WorkType

class ProductTests(BaseTestCase):
    """
    Product Test Suite
    """

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        
        # Map base objects
        self.product_a = self.product_a1
        self.product_b = self.product_b1
        self.url_a = reverse('product-detail', args=[self.product_a.id])
        self.url_b = reverse('product-detail', args=[self.product_b.id])
        self.list_url = reverse('product-list')
        self.category_list_url = reverse('product-category-list')

    # --- BASIC VALIDATION ---

    def test_create_product_missing_data(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {"name": "No SKU", "base_price": 100}
        self.assertEqual(self.client.post(self.list_url, data).status_code, status.HTTP_400_BAD_REQUEST)

    # --- CRUD OPERATIONS ---

    def test_crud_operation_on_product_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        # Verify isolation
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product_ids = [p["id"] for p in response.data.get("results", [])]
        self.assertIn(self.product_a.id, product_ids)
        self.assertNotIn(self.product_b.id, product_ids)

        # Update name
        original_sku = self.product_a.sku
        update_data = {"name": "New Name Owner"}
        response = self.client.patch(self.url_a, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product_a.refresh_from_db()
        self.assertEqual(self.product_a.name, update_data["name"])
        self.assertEqual(self.product_a.sku, original_sku)

        # Soft delete
        self.assertEqual(self.client.delete(self.url_a).status_code, status.HTTP_204_NO_CONTENT)
        self.product_a.refresh_from_db()
        self.assertFalse(self.product_a.is_active)

    def test_crud_operation_on_product_by_manager(self):
        # Manager A1 (Branch A1 assigned)
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.list(self.list_url) if hasattr(self.client, 'list') else self.client.get(self.list_url)
        product_ids = [p["id"] for p in response.data.get("results", [])]
        self.assertIn(self.product_a.id, product_ids)
        self.assertNotIn(self.product_b.id, product_ids)

        response = self.client.patch(self.url_a, {"name": "New Name Mgr"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_crud_operation_on_product_by_employee_without_permission(self):
        self.client.force_authenticate(user=self.employee_a1)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(self.url_a).status_code, status.HTTP_403_FORBIDDEN)

    def test_crud_operation_on_product_by_employee_with_permission(self):
        # Grant permissions
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.PRODUCT)
        self.client.force_authenticate(user=self.employee_a1)
        
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.patch(self.url_a, {"name": "Emp Update"}).status_code, status.HTTP_200_OK)

    # --- ISOLATION TESTS ---

    def test_isolation_owner_cannot_access_other_business_product(self):
        self.client.force_authenticate(user=self.owner_a)
        self.assertEqual(self.client.get(self.url_b).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(self.url_b, {"name": "X"}).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(self.url_b).status_code, status.HTTP_404_NOT_FOUND)

    # --- FIELD VALIDATION ---

    def test_sku_uniqueness_per_business(self):
        self.client.force_authenticate(user=self.owner_a)
        # Duplicate SKU
        data = {
            "name": "Dup SKU", 
            "sku": self.product_a.sku, 
            "base_price": 10, "cost_price": 5, 
            "input_gst_rate": 0, "output_gst_rate": 0
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Verify details
        self.assertIn("sku", str(response.data.get("details", "")))

    def test_price_decimal_constraints(self):
        self.client.force_authenticate(user=self.owner_a)
        # base_price max_digits=12, Sending 13 total digits
        data = {
            "name": "Huge Price", "sku": "HUGE-1", 
            "base_price": "123456789012.00", 
            "cost_price": 10, "input_gst_rate": 0, "output_gst_rate": 0
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_gst_decimal_constraints(self):
        self.client.force_authenticate(user=self.owner_a)
        # input_gst_rate max_digits=5, decimal_places=2. Max value is 999.99
        data = {
            "name": "High GST", "sku": "GST-1", 
            "base_price": 100, "cost_price": 50, 
            "input_gst_rate": "1000.00", "output_gst_rate": 18
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_net_profit_calculation(self):
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "name": "ProfitTest", "sku": "PF-REFACK", 
            "base_price": 150.00, "cost_price": 100.00, 
            "input_gst_rate": 0, "output_gst_rate": 0
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(sku=data["sku"])
        # Verify profit
        expected_profit = float(data["base_price"]) - float(data["cost_price"])
        self.assertEqual(float(product.net_profit), expected_profit)

    # --- CATEGORY TESTS ---

        # Create
        data = {"name": "New Cat", "description": "Desc"}
        response = self.client.post(self.category_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cat_id = response.data["id"]

        # Verify isolation
        response = self.client.get(self.category_list_url)
        from apps.product.models import ProductCategory
        expected_count = ProductCategory.objects.filter(business=self.owner_a.business).count()
        self.assertEqual(len(response.data["results"]), expected_count)

        # Update name
        detail_url = reverse("product-category-detail", args=[cat_id])
        update_data = {"name": "Updated Cat"}
        self.client.patch(detail_url, update_data)
        self.assertEqual(ProductCategory.objects.get(id=cat_id).name, update_data["name"])

        # Soft delete
        self.client.delete(detail_url)
        # Verify inactive
        self.assertFalse(ProductCategory.all_objects.get(id=cat_id).is_active)

    # --- FILTERING TESTS ---

    def test_product_filtering_combinations(self):
        self.client.force_authenticate(user=self.owner_a)
        # Seeded data reference

        # 1. Filter by Name (icontains)
        search_name = "Product"
        response = self.client.get(f"{self.list_url}?name={search_name}")
        expected_count = Product.objects.filter(business=self.owner_a.business, name__icontains=search_name).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        # Ordered by -created_at, A2 is newer
        self.assertEqual(response.data["results"][0]["name"], "Product A2")
        self.assertEqual(response.data["results"][1]["name"], "Product A1")
        

        # 2. Filter by Name Case-Insensitive (icontains)
        search_name = "product a1"
        response = self.client.get(f"{self.list_url}?name={search_name}")
        expected_count = Product.objects.filter(business=self.owner_a.business, name__icontains=search_name).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["id"], self.product_a1.id)
        self.assertEqual(response.data["results"][0]["name"], "Product A1")

        # 3. Filter by SKU (icontains)
        search_sku = "A2"
        response = self.client.get(f"{self.list_url}?sku={search_sku}")
        expected_count = Product.objects.filter(business=self.owner_a.business, sku__icontains=search_sku).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["id"], self.product_a2.id)
        self.assertEqual(response.data["results"][0]["sku"], "PRD-A2")

        # 4. Filter by Category (exact)
        response = self.client.get(f"{self.list_url}?product_category={self.category_a.id}")
        expected_count = Product.objects.filter(business=self.owner_a.business, product_category=self.category_a).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["product_category"]["id"], self.category_a.id)
        self.assertEqual(response.data["results"][1]["product_category"]["id"], self.category_a.id)

        # 5. Filter by Name AND Category
        response = self.client.get(f"{self.list_url}?name=A1&product_category={self.category_a.id}")
        expected_count = Product.objects.filter(business=self.owner_a.business, name__icontains="A1", product_category=self.category_a).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["sku"], "PRD-A1")
        self.assertEqual(response.data["results"][0]["product_category"]["id"], self.category_a.id)

        # 6. Filter by SKU AND Category
        response = self.client.get(f"{self.list_url}?sku=PRD-A2&product_category={self.category_a.id}")
        expected_count = Product.objects.filter(business=self.owner_a.business, sku__icontains="PRD-A2", product_category=self.category_a).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["name"], "Product A2")
        self.assertEqual(response.data["results"][0]["product_category"]["id"], self.category_a.id)

        # 7. Filter by Name AND SKU
        response = self.client.get(f"{self.list_url}?name=Product&sku=A1")
        expected_count = Product.objects.filter(business=self.owner_a.business, name__icontains="Product", sku__icontains="A1").count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["id"], self.product_a1.id)
        self.assertEqual(response.data["results"][0]["product_category"]["id"], self.category_a.id)

        # 8. All Filters Combined (Success)
        response = self.client.get(f"{self.list_url}?name=Product&sku=PRD&product_category={self.category_a.id}")
        expected_count = Product.objects.filter(business=self.owner_a.business, name__icontains="Product", sku__icontains="PRD", product_category=self.category_a).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["product_category"]["id"], self.category_a.id)
        self.assertEqual(response.data["results"][1]["product_category"]["id"], self.category_a.id)
        # Verify both products are present
        names = [r["name"] for r in response.data["results"]]
        self.assertIn("Product A1", names)
        self.assertIn("Product A2", names)
        skus = [r["sku"] for r in response.data["results"]]
        self.assertIn("PRD-A1", skus)
        self.assertIn("PRD-A2", skus)
        

        # 9. Filter with No Results (Non-existent Name)
        response = self.client.get(f"{self.list_url}?name=NonExistentProduct")
        self.assertEqual(len(response.data["results"]), 0)

        response = self.client.get(f"{self.list_url}?sku=PRD-B2&product_category={self.category_a.id}")
        self.assertEqual(len(response.data["results"]), 0)

    # --- PAGINATION TESTS ---

    def test_product_pagination(self):
        self.client.force_authenticate(user=self.owner_a)
        # Seed 7 products
        for i in range(5):
            Product.objects.create(
                business=self.business_a,
                name=f"Paginated Product {i}",
                sku=f"PG-SKU-{i}",
                base_price=100.00,
                cost_price=50.00,
                input_gst_rate=18.00,
                output_gst_rate=18.00,
                product_category=self.category_a
            )
        
        # 1. Page 1
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Page size 6
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])
        
        # 2. Page 2
        next_url = response.data["next"]
        response = self.client.get(next_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Remaining product
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])
