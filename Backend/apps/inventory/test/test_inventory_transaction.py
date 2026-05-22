from django.urls import reverse
from rest_framework import status
from apps.inventory.models import InventoryTransaction
from apps.employee.models import WorkType
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog


class InventoryTransactionTests(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.transaction_url = reverse('inventorytransaction-list')

    def get_transaction_data(self, branch_id, product_id=None):
        return {
            "branch_id": branch_id,
            "action": InventoryTransaction.Action.IN,
            "description": "Stock Test",
            "items": [{"product_id": product_id or self.product_a1.id, "quantity": 10}]
        }

    # --- OWNER ---

    def test_inventory_transaction_by_owner(self):
        """Owner CRUD."""
        self.client.force_authenticate(user=self.owner_a)
        
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        response = self.client.post(url, self.get_transaction_data(self.branch_a1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.INVENTORY)
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 1)

        url_b = f"{self.transaction_url}?branch={self.branch_b1.id}"
        response = self.client.post(url_b, self.get_transaction_data(self.branch_b1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        response = self.client.get(url_b)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 0)

    def test_inventory_transaction_by_owner_without_query_params(self):
        """Owner CRUD without query parameters in URL."""
        self.client.force_authenticate(user=self.owner_a)
        
        url = self.transaction_url
        response = self.client.post(url, self.get_transaction_data(self.branch_a1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    # --- MANAGER ---

    def test_inventory_transaction_by_manager_on_assigned_branch(self):
        """Manager success."""
        self.client.force_authenticate(user=self.manager_a1)
        
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        self.assertEqual(self.client.post(url, self.get_transaction_data(self.branch_a1.id), format='json').status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 1)

    def test_inventory_transaction_by_manager_on_not_assigned_branch(self):
        """Manager isolation."""
        self.client.force_authenticate(user=self.manager_a1)
        
        url_a2 = f"{self.transaction_url}?branch={self.branch_a2.id}"
        self.assertEqual(self.client.post(url_a2, self.get_transaction_data(self.branch_a2.id), format='json').status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(url_a2)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 0)

    # --- EMPLOYEE ---

    def test_employee_with_perm_and_work_on_assigned_branch(self):
        """Employee success."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        self.client.force_authenticate(user=self.employee_a1)
        
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        data = self.get_transaction_data(self.branch_a1.id)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 1)

        url_b = f"{self.transaction_url}?branch={self.branch_b1.id}"
        self.assertEqual(self.client.post(url_b, self.get_transaction_data(self.branch_b1.id), format='json').status_code, status.HTTP_400_BAD_REQUEST)
        response_b = self.client.get(url_b)
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_b.data.get("results", [])), 0)

    def test_employee_with_perm_without_work_on_assigned_branch(self):
        """Missing work."""
        self.client.force_authenticate(user=self.employee_a1)
        
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        response = self.client.post(url, self.get_transaction_data(self.branch_a1.id), format='json')
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        
        response = self.client.get(url)
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(len(response.data.get("results", [])), 0)
        else:
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_with_perm_and_work_on_unassigned_branch(self):
        """Employee isolation."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        self.client.force_authenticate(user=self.employee_a1)
        
        url_a2 = f"{self.transaction_url}?branch={self.branch_a2.id}"
        self.assertEqual(self.client.post(url_a2, self.get_transaction_data(self.branch_a2.id), format='json').status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(url_a2)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 0)

    def test_employee_without_perm_on_assigned_branch(self):
        """No permission."""
        self.client.force_authenticate(user=self.employee_a1)
        
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        response = self.client.get(url)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK])
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(len(response.data.get("results", [])), 0)

    def test_employee_isolation_other_business(self):
        """Business isolation."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.INVENTORY)
        self.client.force_authenticate(user=self.employee_a1)
        
        url_b = f"{self.transaction_url}?branch={self.branch_b1.id}"
        self.assertEqual(self.client.post(url_b, self.get_transaction_data(self.branch_b1.id, product_id=self.product_b1.id), format='json').status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(url_b)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", [])), 0)

    # --- FUNCTIONAL ---

    def test_transaction_with_product_not_in_business(self):
        """Wrong business."""
        self.client.force_authenticate(user=self.owner_a)
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        
        data = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Cross-business",
            "items": [{"product_id": self.product_b1.id, "quantity": 10}]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transaction_out_with_insufficient_stock(self):
        """Low stock."""
        self.client.force_authenticate(user=self.owner_a)
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        
        data = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.OUT,
            "description": "Insufficient",
            "items": [{"product_id": self.product_a1.id, "quantity": 101}]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", str(response.data))

    def test_transaction_in_and_out_stock_updates(self):
        """Stock updates."""
        self.client.force_authenticate(user=self.owner_a)
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        
        inv_prod = self.inventory_product_a1_1
        self.assertEqual(inv_prod.stock_quantity, 100)
        
        data_in = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Update",
            "items": [{"product_id": self.product_a1.id, "quantity": 10}]
        }
        response = self.client.post(url, data_in, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        inv_prod.refresh_from_db()
        self.assertEqual(inv_prod.stock_quantity, 110)
        
        data_out = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.OUT,
            "description": "Update",
            "items": [{"product_id": self.product_a1.id, "quantity": 14}]
        }
        self.client.post(url, data_out, format='json')
        inv_prod.refresh_from_db()
        self.assertEqual(inv_prod.stock_quantity, 96)

    def test_inventory_transaction_items_creation_and_fields(self):
        """Record verification."""
        self.client.force_authenticate(user=self.owner_a)
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        
        data = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Verify",
            "items": [{"product_id": self.product_a1.id, "quantity": 10}]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        transaction = InventoryTransaction.objects.get(id=response.data['id'])
        self.assertEqual(transaction.action, InventoryTransaction.Action.IN)
        self.assertEqual(transaction.items.count(), 1)
        item = transaction.items.first()
        self.assertEqual(item.product, self.product_a1)
        self.assertEqual(item.quantity, 10)

    def test_transaction_with_duplicate_products(self):
        """Duplicate items."""
        self.client.force_authenticate(user=self.owner_a)
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        
        inv_prod = self.inventory_product_a1_1
        self.assertEqual(inv_prod.stock_quantity, 100)
        
        data = {
            "branch_id": self.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Double",
            "items": [
                {"product_id": self.product_a1.id, "quantity": 10},
                {"product_id": self.product_a1.id, "quantity": 20},
                {"product_id": self.product_a1.id, "quantity": 30},
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        inv_prod.refresh_from_db()
        self.assertEqual(inv_prod.stock_quantity, 160)

    # --- FILTERING TESTS (10+ COMBINATIONS) ---

    def test_inventory_transaction_filtering_combinations(self):
        """Transaction filter combinations."""
        self.client.force_authenticate(user=self.owner_a)
        from django.utils import timezone
        from datetime import timedelta
        from apps.inventory.models import InventoryTransactionItem

        # Create base transactions
        t1 = InventoryTransaction.objects.create(
            inventory=self.branch_a1.inventory,
            action=InventoryTransaction.Action.IN,
            description="Today In"
        )
        InventoryTransactionItem.objects.create(transaction=t1, product=self.product_a1, quantity=5)
        
        t2 = InventoryTransaction.objects.create(
            inventory=self.branch_a2.inventory,
            action=InventoryTransaction.Action.OUT,
            description="Yesterday Out"
        )
        InventoryTransactionItem.objects.create(transaction=t2, product=self.product_a2, quantity=10)

        # Update dates
        InventoryTransaction.objects.filter(id=t1.id).update(created_at=timezone.now())
        InventoryTransaction.objects.filter(id=t2.id).update(created_at=timezone.now() - timedelta(days=1))

        base_url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        base_url_a2 = f"{self.transaction_url}?branch={self.branch_a2.id}"

        # 1. Action filter
        response = self.client.get(f"{base_url}&action=IN")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["action"], "IN")

        # 2. Product name filter
        response = self.client.get(f"{base_url}&product_name={self.product_a1.name}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["items"][0]["product"]["name"], "Product A1")
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)

        # 3. Product SKU filter
        response = self.client.get(f"{base_url_a2}&product_sku={self.product_a2.sku}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["items"][0]["product"]["sku"],self.product_a2.sku)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a2.id)

        # 4. Branch filter
        response = self.client.get(f"{self.transaction_url}?branch={self.branch_a1.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["branch"],self.branch_a1.id)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)

        # 5. From date filter
        from_date = (timezone.localdate()).isoformat()
        response = self.client.get(f"{base_url}&from_date={from_date}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["created_at"][:10], from_date)

        # 6. To date filter
        to_date = (timezone.localdate()).isoformat()
        response = self.client.get(f"{base_url_a2}&to_date={to_date}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertLessEqual(response.data["results"][0]["created_at"][:10], to_date)

        # 7. Action + Branch
        response = self.client.get(f"{self.transaction_url}?action=IN&branch={self.branch_a1.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["action"], "IN")
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)

        # 8. Product name + From date
        response = self.client.get(f"{base_url}&product_name={self.product_a1.name}&from_date={from_date}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["items"][0]["product"]["name"], "Product A1")
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)
        self.assertEqual(response.data["results"][0]["created_at"][:10], from_date)

        # 9. Product SKU + To date
        response = self.client.get(f"{base_url_a2}&product_sku={self.product_a2.sku}&to_date={to_date}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["items"][0]["product"]["sku"], self.product_a2.sku)
        self.assertLessEqual(response.data["results"][0]["created_at"][:10], to_date)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a2.id)

        # 10. All combined
        response = self.client.get(
            f"{base_url}&action=IN&product_name={self.product_a1.name}&from_date={from_date}"
        )
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["items"][0]["product"]["name"], "Product A1")
        self.assertEqual(response.data["results"][0]["created_at"][:10], from_date)

    # --- PAGINATION TESTS ---

    def test_inventory_transaction_pagination(self):
        """Transaction pagination test."""
        self.client.force_authenticate(user=self.owner_a)
        # Seed 10 more (total 10+)
        for i in range(10):
            InventoryTransaction.objects.create(
                inventory=self.branch_a1.inventory,
                action=InventoryTransaction.Action.IN,
                description=f"Paginated {i}"
            )
        
        url = f"{self.transaction_url}?branch={self.branch_a1.id}"
        # Page 1
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])

        # Page 2
        response = self.client.get(response.data["next"])
        self.assertEqual(len(response.data["results"]), 4)
        self.assertIsNone(response.data["next"])
