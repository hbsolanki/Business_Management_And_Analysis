import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.inventory.models import InventoryTransaction, InventoryProduct
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def inv_product_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.stock_url = reverse('inventoryproduct-list')
    tc.transaction_url = reverse('inventorytransaction-list')
    return tc


def create_inventory_transaction(api_client, env, branch_id, action, quantity, product_id, description=None):
    url = f"{env.transaction_url}?branch={branch_id}"
    data = {
        "branch_id": branch_id,
        "action": action,
        "description": description or f"Test {action}",
        "items": [{"product_id": product_id, "quantity": quantity}]
    }
    return api_client.post(url, data, format='json')


@pytest.mark.django_db
class TestInventoryProduct:

    def test_inventory_product_stock_flow_by_owner(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.owner_a)
        sut_url_a = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"

        # Act & Assert - Initial check
        res_initial = api_client.get(sut_url_a)
        results = res_initial.data.get("results", [])
        assert len(results) == 2
        prod_a1_stock = next(r for r in results if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        initial_stock = inv_product_env.inventory_product_a1_1.stock_quantity
        assert prod_a1_stock == initial_stock

        # Act - Transaction IN
        in_qty = 10
        create_inventory_transaction(api_client, inv_product_env, inv_product_env.branch_a1.id, InventoryTransaction.Action.IN, in_qty, inv_product_env.product_a1.id)

        # Assert - After IN
        res_after_in = api_client.get(sut_url_a)
        results_in = res_after_in.data.get("results", [])
        prod_a1_stock = next(r for r in results_in if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        assert prod_a1_stock == initial_stock + in_qty

        # Act - Transaction OUT
        out_qty = 4
        create_inventory_transaction(api_client, inv_product_env, inv_product_env.branch_a1.id, InventoryTransaction.Action.OUT, out_qty, inv_product_env.product_a1.id)

        # Assert - After OUT
        res_after_out = api_client.get(sut_url_a)
        results_out = res_after_out.data.get("results", [])
        prod_a1_stock = next(r for r in results_out if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        assert prod_a1_stock == initial_stock + in_qty - out_qty

    def test_inventory_product_by_manager_on_assigned_branch(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.manager_a1)
        sut_url_a = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"
        sut_url_b = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_b1.id}"

        # Act & Assert - Assigned
        res_a = api_client.get(sut_url_a)
        assert res_a.status_code == status.HTTP_200_OK
        assert len(res_a.data.get("results", [])) == 2

        # Act & Assert - Other business
        res_b = api_client.get(sut_url_b)
        assert len(res_b.data.get("results", [])) == 0

    def test_inventory_product_by_manager_on_not_assigned_branch(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.manager_a1)
        sut_url_a2 = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a2.id}"

        # Act
        sut_response = api_client.get(sut_url_a2)

        # Assert
        assert len(sut_response.data.get("results", [])) == 0

    def test_employee_stock_flow_on_assigned_branch(self, api_client, inv_product_env):
        # Arrange
        inv_product_env.assign_work_to_user(inv_product_env.employee_a1, inv_product_env.branch_a1, WorkType.INVENTORY)
        api_client.force_authenticate(user=inv_product_env.employee_a1)

        initial_stock = inv_product_env.inventory_product_a1_1.stock_quantity
        in_qty = 15

        # Act
        create_inventory_transaction(api_client, inv_product_env, inv_product_env.branch_a1.id, InventoryTransaction.Action.IN, in_qty, inv_product_env.product_a1.id)

        # Assert
        sut_url_a = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"
        res = api_client.get(sut_url_a)
        results = res.data.get("results", [])
        prod_a1_stock = next(r for r in results if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        assert prod_a1_stock == initial_stock + in_qty

        sut_url_b = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_b1.id}"
        assert len(api_client.get(sut_url_b).data.get("results", [])) == 0

    def test_employee_with_perm_without_work_on_assigned_branch(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.employee_a1)
        sut_url_a = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"

        # Act
        sut_response = api_client.get(sut_url_a)

        # Assert
        if sut_response.status_code == status.HTTP_200_OK:
            assert len(sut_response.data.get("results", [])) == 0
        else:
            assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_with_perm_and_work_on_unassigned_branch(self, api_client, inv_product_env):
        # Arrange
        inv_product_env.assign_work_to_user(inv_product_env.employee_a1, inv_product_env.branch_a1, WorkType.INVENTORY)
        api_client.force_authenticate(user=inv_product_env.employee_a1)
        sut_url_a2 = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a2.id}"

        # Act
        sut_response = api_client.get(sut_url_a2)

        # Assert
        assert len(sut_response.data.get("results", [])) == 0

    def test_employee_without_perm_on_assigned_branch(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.employee_a2)
        sut_url_a2 = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a2.id}"

        # Act
        sut_response = api_client.get(sut_url_a2)

        # Assert
        if sut_response.status_code == status.HTTP_200_OK:
            assert len(sut_response.data.get("results", [])) == 0
        else:
            assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_isolation_other_business(self, api_client, inv_product_env):
        # Arrange
        inv_product_env.assign_work_to_user(inv_product_env.employee_a1, inv_product_env.branch_a1, WorkType.INVENTORY)
        api_client.force_authenticate(user=inv_product_env.employee_a1)
        sut_url_b = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_b1.id}"

        # Act
        sut_response = api_client.get(sut_url_b)

        # Assert
        assert len(sut_response.data.get("results", [])) == 0

    def test_inventory_product_multiple_products_success(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.owner_a)
        sut_url_a = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"
        payload = {
            "branch_id": inv_product_env.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Multi-product",
            "items": [
                {"product_id": inv_product_env.product_a1.id, "quantity": 10},
                {"product_id": inv_product_env.product_a2.id, "quantity": 20}
            ]
        }

        # Act
        resp = api_client.post(f"{inv_product_env.transaction_url}?branch={inv_product_env.branch_a1.id}", payload, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

        # Assert
        sut_response = api_client.get(sut_url_a)
        results = sut_response.data.get("results", [])
        stock_a1 = next(r for r in results if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        stock_a2 = next(r for r in results if r['product']['id'] == inv_product_env.product_a2.id)['stock_quantity']
        assert stock_a1 == 110
        assert stock_a2 == 120

    def test_inventory_product_branch_isolation_same_business(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.owner_a)
        create_inventory_transaction(api_client, inv_product_env, inv_product_env.branch_a1.id, InventoryTransaction.Action.IN, 10, inv_product_env.product_a1.id)

        sut_url_a1 = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"
        sut_url_a2 = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a2.id}"

        # Act & Assert - Branch A1
        res_a1 = api_client.get(sut_url_a1).data.get("results", [])
        prod_a1_stock = next(r for r in res_a1 if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        assert prod_a1_stock == 110

        # Act & Assert - Branch A2
        res_a2 = api_client.get(sut_url_a2).data.get("results", [])
        prod_a1_stock_a2 = next(r for r in res_a2 if r['product']['id'] == inv_product_env.product_a1.id)['stock_quantity']
        assert prod_a1_stock_a2 == 100

    def test_inventory_product_filtering_combinations(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.owner_a)
        base_url = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"

        # Act & Assert - 1. Name filter
        search_name = "A1"
        res1 = api_client.get(f"{base_url}&name={search_name}")
        assert len(res1.data["results"]) == 1
        assert res1.data["results"][0]["product"]["name"] == "Product A1"

        # Act & Assert - 2. SKU filter
        search_sku = "PRD-A2"
        res2 = api_client.get(f"{base_url}&sku={search_sku}")
        assert len(res2.data["results"]) == 1
        assert res2.data["results"][0]["product"]["sku"] == "PRD-A2"

        # Act & Assert - 3. Branch filter
        res3 = api_client.get(f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a2.id}")
        assert len(res3.data["results"]) == 2

        # Act & Assert - 4. Name + SKU
        res4 = api_client.get(f"{base_url}&name={inv_product_env.product_a1.name}&sku={inv_product_env.product_a1.sku}")
        assert len(res4.data["results"]) == 1
        assert res4.data["results"][0]["product"]["name"] == "Product A1"
        assert res4.data["results"][0]["product"]["sku"] == "PRD-A1"

    def test_inventory_product_pagination(self, api_client, inv_product_env):
        # Arrange
        api_client.force_authenticate(user=inv_product_env.owner_a)
        for i in range(5):
            p = inv_product_env.create_product(
                business=inv_product_env.business_a,
                name=f"Extra {i}",
                product_category=inv_product_env.category_a
            )
            InventoryProduct.objects.create(
                inventory=inv_product_env.branch_a1.inventory,
                product=p,
                stock_quantity=10
            )

        sut_url = f"{inv_product_env.stock_url}?branch={inv_product_env.branch_a1.id}"

        # Act - Page 1
        res_page1 = api_client.get(sut_url)
        assert res_page1.status_code == 200
        assert len(res_page1.data["results"]) == 6
        assert res_page1.data["next"] is not None

        # Act - Page 2
        res_page2 = api_client.get(res_page1.data["next"])
        assert len(res_page2.data["results"]) == 1
        assert res_page2.data["next"] is None
