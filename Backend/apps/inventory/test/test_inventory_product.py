from django.urls import reverse
from rest_framework import status
from apps.inventory.models import InventoryTransaction
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType

class InventoryProductTests(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.stock_url = reverse('inventoryproduct-list')
        self.transaction_url = reverse('inventorytransaction-list')

    def create_inventory_transaction(self, branch_id, action, quantity, product_id, description=None):
        """Transaction helper."""
        url = f"{self.transaction_url}?branch={branch_id}"
        data = {
            "branch_id": branch_id,
            "action": action,
            "description": description or f"Test {action}",
            "items": [{"product_id": product_id, "quantity": quantity}]
        }
        return self.client.post(url, data, format='json')

    def test_inventory_product_stock_flow_by_owner(self):
        """Owner flow."""
        self.client.force_authenticate(user=self.owner_a)
        url_a = f"{self.stock_url}?branch={self.branch_a1.id}"
        
        response = self.client.get(url_a)
        results = response.data.get("results", [])
        self.assertEqual(len(results), 2)
        
        prod_a1_stock = next(r for r in results if r['product']['id'] == self.product_a1.id)['stock_quantity']
        self.assertEqual(prod_a1_stock, 100)

        self.create_inventory_transaction(self.branch_a1.id, InventoryTransaction.Action.IN, 10, self.product_a1.id)
        
        response = self.client.get(url_a)
        results = response.data.get("results", [])
        prod_a1_stock = next(r for r in results if r['product']['id'] == self.product_a1.id)['stock_quantity']
        self.assertEqual(prod_a1_stock, 110)

        self.create_inventory_transaction(self.branch_a1.id, InventoryTransaction.Action.OUT, 4, self.product_a1.id)

        response = self.client.get(url_a)
        results = response.data.get("results", [])
        prod_a1_stock = next(r for r in results if r['product']['id'] == self.product_a1.id)['stock_quantity']
        self.assertEqual(prod_a1_stock, 106)

    def test_inventory_product_by_manager_on_assigned_branch(self):
        """Manager success."""
        self.client.force_authenticate(user=self.manager_a1)

        url_a = f"{self.stock_url}?branch={self.branch_a1.id}"
        response = self.client.get(url_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 2)

        url_b = f"{self.stock_url}?branch={self.branch_b1.id}"
        response_b = self.client.get(url_b)
        self.assertEqual(len(response_b.data.get("results", [])), 0)

    def test_inventory_product_by_manager_on_not_assigned_branch(self):
        """Manager isolation."""
        self.client.force_authenticate(user=self.manager_a1)

        url_a2 = f"{self.stock_url}?branch={self.branch_a2.id}"
        response = self.client.get(url_a2)
        self.assertEqual(len(response.data.get("results", [])), 0)

    def test_employee_stock_flow_on_assigned_branch(self):
        """Employee flow."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        self.client.force_authenticate(user=self.employee_a1)

        url_a = f"{self.stock_url}?branch={self.branch_a1.id}"
        self.create_inventory_transaction(self.branch_a1.id, InventoryTransaction.Action.IN, 15, self.product_a1.id)
        
        response = self.client.get(url_a)
        results = response.data.get("results", [])
        prod_a1_stock = next(r for r in results if r['product']['id'] == self.product_a1.id)['stock_quantity']
        self.assertEqual(prod_a1_stock, 115)

        url_b = f"{self.stock_url}?branch={self.branch_b1.id}"
        response_b = self.client.get(url_b)
        self.assertEqual(len(response_b.data.get("results", [])), 0)

    def test_employee_with_perm_without_work_on_assigned_branch(self):
        """Missing work."""
        self.client.force_authenticate(user=self.employee_a1)
        
        url_a = f"{self.stock_url}?branch={self.branch_a1.id}"
        response = self.client.get(url_a)
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(len(response.data.get("results", [])), 0)
        else:
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_with_perm_and_work_on_unassigned_branch(self):
        """Employee isolation."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        self.client.force_authenticate(user=self.employee_a1)

        url_a2 = f"{self.stock_url}?branch={self.branch_a2.id}"
        response = self.client.get(url_a2)
        self.assertEqual(len(response.data.get("results", [])), 0)

    def test_employee_without_perm_on_assigned_branch(self):
        """No permission."""
        self.client.force_authenticate(user=self.employee_a2)

        url_a2 = f"{self.stock_url}?branch={self.branch_a2.id}"
        response = self.client.get(url_a2)
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(len(response.data.get("results", [])), 0)
        else:
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_isolation_other_business(self):
        """Business isolation."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        self.client.force_authenticate(user=self.employee_a1)

        url_b = f"{self.stock_url}?branch={self.branch_b1.id}"
        response_b = self.client.get(url_b)
        self.assertEqual(len(response_b.data.get("results", [])), 0)

    def test_inventory_product_multiple_products_success(self):
        """Multi products."""
        self.client.force_authenticate(user=self.owner_a)
        url_a = f"{self.stock_url}?branch={self.branch_a1.id}"
        
        data = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Multi-product",
            "items": [
                {"product_id": self.product_a1.id, "quantity": 10},
                {"product_id": self.product_a2.id, "quantity": 20}
            ]
        }
        resp = self.client.post(f"{self.transaction_url}?branch={self.branch_a1.id}", data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        response = self.client.get(url_a)
        results = response.data.get("results", [])
        
        stock_a1 = next(r for r in results if r['product']['id'] == self.product_a1.id)['stock_quantity']
        stock_a2 = next(r for r in results if r['product']['id'] == self.product_a2.id)['stock_quantity']
        
        self.assertEqual(stock_a1, 110)
        self.assertEqual(stock_a2, 120)

    def test_inventory_product_branch_isolation_same_business(self):
        """Branch isolation."""
        self.client.force_authenticate(user=self.owner_a)
        self.create_inventory_transaction(self.branch_a1.id, InventoryTransaction.Action.IN, 10, self.product_a1.id)
        
        url_a1 = f"{self.stock_url}?branch={self.branch_a1.id}"
        response_a1 = self.client.get(url_a1)
        res_a1 = response_a1.data.get("results", [])
        prod_a1_stock = next(r for r in res_a1 if r['product']['id'] == self.product_a1.id)['stock_quantity']
        self.assertEqual(prod_a1_stock, 110)
        
        url_a2 = f"{self.stock_url}?branch={self.branch_a2.id}"
        response_a2 = self.client.get(url_a2)
        res_a2 = response_a2.data.get("results", [])
        prod_a1_stock_a2 = next(r for r in res_a2 if r['product']['id'] == self.product_a1.id)['stock_quantity']
        self.assertEqual(prod_a1_stock_a2, 100)

    # --- FILTERING TESTS ---

    def test_inventory_product_filtering_combinations(self):
        """Stock filter combinations."""
        self.client.force_authenticate(user=self.owner_a)
        base_url = f"{self.stock_url}?branch={self.branch_a1.id}"

        # 1. Name filter (icontains)
        response = self.client.get(f"{base_url}&name=A1")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["product"]["name"], "Product A1")

        # 2. SKU filter (icontains)
        response = self.client.get(f"{base_url}&sku=PRD-A2")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["product"]["sku"], "PRD-A2")

        # 3. Branch filter (mandatory)
        response = self.client.get(f"{self.stock_url}?branch={self.branch_a2.id}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["branch_id"], self.branch_a2.id)
        self.assertEqual(response.data["results"][1]["branch_id"], self.branch_a2.id)

        response = self.client.get(f"{self.stock_url}?branch={self.branch_b1.id}")
        self.assertEqual(len(response.data["results"]), 0)

        # 4. Name + SKU
        response = self.client.get(f"{base_url}&name={self.product_a1.name}&sku={self.product_a1.sku}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["product"]["name"], "Product A1")
        self.assertEqual(response.data["results"][0]["product"]["sku"], "PRD-A1")

    # --- PAGINATION TESTS ---

    def test_inventory_product_pagination(self):
        """Stock pagination test."""
        from apps.product.models import Product
        from apps.inventory.models import InventoryProduct
        self.client.force_authenticate(user=self.owner_a)

        # Seed 5 more products (total 2 + 5 = 7)
        for i in range(5):
            p = self.create_product(
                business=self.business_a,
                name=f"Extra {i}",
                product_category=self.category_a
            )
            InventoryProduct.objects.create(
                inventory=self.branch_a1.inventory,
                product=p,
                stock_quantity=10
            )
        
        url = f"{self.stock_url}?branch={self.branch_a1.id}"
        # Page 1 (size 6)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])

        # Page 2 (remaining 1)
        response = self.client.get(response.data["next"])
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])
