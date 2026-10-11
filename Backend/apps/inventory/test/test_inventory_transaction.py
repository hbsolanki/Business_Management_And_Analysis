import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.inventory.models import InventoryTransaction, InventoryTransactionItem
from apps.employee.models import WorkType
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def inventory_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


def get_transaction_data(branch_id, product_id, action=InventoryTransaction.Action.IN, description="Stock Test", qty=10):
    return {
        "branch_id": branch_id,
        "action": action,
        "description": description,
        "items": [{"product_id": product_id, "quantity": qty}]
    }


@pytest.mark.django_db
class TestInventoryTransactionPytest:

    # --- OWNER ---

    def test_inventory_transaction_by_owner(self, api_client, inventory_env):
        """Owner CRUD."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = get_transaction_data(inventory_env.branch_a1.id, inventory_env.product_a1.id)

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED, sut_response.data
        inventory_env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.INVENTORY)

        # Act (get list)
        sut_get_response = sut_client.get(sut_url)

        # Assert
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert len(sut_get_response.data.get("results", [])) == 1

        # Arrange (isolate branch B)
        sut_url_b = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_b1.id}"
        sut_data_b = get_transaction_data(inventory_env.branch_b1.id, inventory_env.product_b1.id)

        # Act
        sut_response_b = sut_client.post(sut_url_b, sut_data_b, format='json')

        # Assert
        assert sut_response_b.status_code == status.HTTP_400_BAD_REQUEST

        # Act
        sut_get_b = sut_client.get(sut_url_b)

        # Assert
        assert sut_get_b.status_code == status.HTTP_200_OK
        assert len(sut_get_b.data.get("results", [])) == 0

    def test_inventory_transaction_by_owner_without_query_params(self, api_client, inventory_env):
        """Owner CRUD without query parameters in URL."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = reverse('inventorytransaction-list')
        sut_data = get_transaction_data(inventory_env.branch_a1.id, inventory_env.product_a1.id)

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED, sut_response.data

    # --- MANAGER ---

    def test_inventory_transaction_by_manager_on_assigned_branch(self, api_client, inventory_env):
        """Manager success."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.manager_a1)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = get_transaction_data(inventory_env.branch_a1.id, inventory_env.product_a1.id)

        # Act
        sut_post_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_post_response.status_code == status.HTTP_201_CREATED

        # Act
        sut_get_response = sut_client.get(sut_url)

        # Assert
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert len(sut_get_response.data.get("results", [])) == 1

    def test_inventory_transaction_by_manager_on_not_assigned_branch(self, api_client, inventory_env):
        """Manager isolation."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.manager_a1)
        sut_url_a2 = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a2.id}"
        sut_data = get_transaction_data(inventory_env.branch_a2.id, inventory_env.product_a2.id)

        # Act
        sut_post_response = sut_client.post(sut_url_a2, sut_data, format='json')

        # Assert
        assert sut_post_response.status_code == status.HTTP_400_BAD_REQUEST

        # Act
        sut_get_response = sut_client.get(sut_url_a2)

        # Assert
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert len(sut_get_response.data.get("results", [])) == 0

    # --- EMPLOYEE ---

    def test_employee_with_perm_and_work_on_assigned_branch(self, api_client, inventory_env):
        """Employee success."""
        # Arrange
        inventory_env.assign_work_to_user(inventory_env.employee_a1, inventory_env.branch_a1, WorkType.INVENTORY)
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.employee_a1)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = get_transaction_data(inventory_env.branch_a1.id, inventory_env.product_a1.id)

        # Act
        sut_post_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_post_response.status_code == status.HTTP_201_CREATED, sut_post_response.data

        # Act
        sut_get_response = sut_client.get(sut_url)

        # Assert
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert len(sut_get_response.data.get("results", [])) == 1

        # Arrange (isolate branch B)
        sut_url_b = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_b1.id}"
        sut_data_b = get_transaction_data(inventory_env.branch_b1.id, inventory_env.product_b1.id)

        # Act
        sut_post_b = sut_client.post(sut_url_b, sut_data_b, format='json')

        # Assert
        assert sut_post_b.status_code == status.HTTP_400_BAD_REQUEST

        # Act
        sut_get_b = sut_client.get(sut_url_b)

        # Assert
        assert sut_get_b.status_code == status.HTTP_200_OK
        assert len(sut_get_b.data.get("results", [])) == 0

    def test_employee_with_perm_without_work_on_assigned_branch(self, api_client, inventory_env):
        """Missing work."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.employee_a1)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = get_transaction_data(inventory_env.branch_a1.id, inventory_env.product_a1.id)

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]

        # Act
        sut_get_response = sut_client.get(sut_url)

        # Assert
        if sut_get_response.status_code == status.HTTP_200_OK:
            assert len(sut_get_response.data.get("results", [])) == 0
        else:
            assert sut_get_response.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_with_perm_and_work_on_unassigned_branch(self, api_client, inventory_env):
        """Employee isolation."""
        # Arrange
        inventory_env.assign_work_to_user(inventory_env.employee_a1, inventory_env.branch_a1, WorkType.INVENTORY)
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.employee_a1)
        sut_url_a2 = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a2.id}"
        sut_data = get_transaction_data(inventory_env.branch_a2.id, inventory_env.product_a2.id)

        # Act
        sut_response = sut_client.post(sut_url_a2, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

        # Act
        sut_get_response = sut_client.get(sut_url_a2)

        # Assert
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert len(sut_get_response.data.get("results", [])) == 0

    def test_employee_without_perm_on_assigned_branch(self, api_client, inventory_env):
        """No permission."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.employee_a1)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK]
        if sut_response.status_code == status.HTTP_200_OK:
            assert len(sut_response.data.get("results", [])) == 0

    def test_employee_isolation_other_business(self, api_client, inventory_env):
        """Business isolation."""
        # Arrange
        inventory_env.assign_work_to_user(inventory_env.employee_a1, inventory_env.branch_a1, WorkType.INVENTORY)
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.employee_a1)
        sut_url_b = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_b1.id}"
        sut_data = get_transaction_data(inventory_env.branch_b1.id, inventory_env.product_b1.id)

        # Act
        sut_post_response = sut_client.post(sut_url_b, sut_data, format='json')

        # Assert
        assert sut_post_response.status_code == status.HTTP_400_BAD_REQUEST

        # Act
        sut_get_response = sut_client.get(sut_url_b)

        # Assert
        assert sut_get_response.status_code == status.HTTP_200_OK
        assert len(sut_get_response.data.get("results", [])) == 0

    # --- FUNCTIONAL ---

    def test_transaction_with_product_not_in_business(self, api_client, inventory_env):
        """Wrong business."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = {
            "branch_id": inventory_env.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Cross-business",
            "items": [{"product_id": inventory_env.product_b1.id, "quantity": 10}]
        }

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_transaction_out_with_insufficient_stock(self, api_client, inventory_env):
        """Low stock."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = {
            "branch_id": inventory_env.branch_a1.id,
            "action": InventoryTransaction.Action.OUT,
            "description": "Insufficient",
            "items": [{"product_id": inventory_env.product_a1.id, "quantity": 101}]
        }

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Insufficient stock" in str(sut_response.data)

    def test_transaction_in_and_out_stock_updates(self, api_client, inventory_env):
        """Stock updates."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_inv_prod = inventory_env.inventory_product_a1_1
        assert sut_inv_prod.stock_quantity == 100

        sut_data_in = {
            "branch_id": inventory_env.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Update",
            "items": [{"product_id": inventory_env.product_a1.id, "quantity": 10}]
        }

        # Act
        sut_res_in = sut_client.post(sut_url, sut_data_in, format='json')

        # Assert
        assert sut_res_in.status_code == status.HTTP_201_CREATED
        sut_inv_prod.refresh_from_db()
        assert sut_inv_prod.stock_quantity == 110

        # Arrange
        sut_data_out = {
            "branch_id": inventory_env.branch_a1.id,
            "action": InventoryTransaction.Action.OUT,
            "description": "Update",
            "items": [{"product_id": inventory_env.product_a1.id, "quantity": 14}]
        }

        # Act
        sut_res_out = sut_client.post(sut_url, sut_data_out, format='json')

        # Assert
        assert sut_res_out.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        sut_inv_prod.refresh_from_db()
        assert sut_inv_prod.stock_quantity == 96

    def test_inventory_transaction_items_creation_and_fields(self, api_client, inventory_env):
        """Record verification."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_data = {
            "branch_id": inventory_env.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Verify",
            "items": [{"product_id": inventory_env.product_a1.id, "quantity": 10}]
        }

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        sut_tx = InventoryTransaction.objects.get(id=sut_response.data['id'])
        assert sut_tx.action == InventoryTransaction.Action.IN
        assert sut_tx.items.count() == 1
        sut_item = sut_tx.items.first()
        assert sut_item.product == inventory_env.product_a1
        assert sut_item.quantity == 10

    def test_transaction_with_duplicate_products(self, api_client, inventory_env):
        """Duplicate items."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_inv_prod = inventory_env.inventory_product_a1_1
        assert sut_inv_prod.stock_quantity == 100

        sut_data = {
            "branch_id": inventory_env.branch_a1.id,
            "action": InventoryTransaction.Action.IN,
            "description": "Double",
            "items": [
                {"product_id": inventory_env.product_a1.id, "quantity": 10},
                {"product_id": inventory_env.product_a1.id, "quantity": 20},
                {"product_id": inventory_env.product_a1.id, "quantity": 30},
            ]
        }

        # Act
        sut_response = sut_client.post(sut_url, sut_data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        sut_inv_prod.refresh_from_db()
        assert sut_inv_prod.stock_quantity == 160

    # --- FILTERING TESTS (10+ COMBINATIONS) ---

    def test_inventory_transaction_filtering_combinations(self, api_client, inventory_env):
        """Transaction filter combinations."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)

        t1 = InventoryTransaction.objects.create(
            inventory=inventory_env.branch_a1.inventory,
            action=InventoryTransaction.Action.IN,
            description="Today In"
        )
        InventoryTransactionItem.objects.create(transaction=t1, product=inventory_env.product_a1, quantity=5)

        t2 = InventoryTransaction.objects.create(
            inventory=inventory_env.branch_a2.inventory,
            action=InventoryTransaction.Action.OUT,
            description="Yesterday Out"
        )
        InventoryTransactionItem.objects.create(transaction=t2, product=inventory_env.product_a2, quantity=10)

        InventoryTransaction.objects.filter(id=t1.id).update(created_at=timezone.now())
        InventoryTransaction.objects.filter(id=t2.id).update(created_at=timezone.now() - timedelta(days=1))

        sut_base_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"
        sut_base_url_a2 = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a2.id}"
        from_date = (timezone.localdate()).isoformat()
        to_date = (timezone.localdate()).isoformat()

        # Act & Assert 1. Action filter
        res1 = sut_client.get(f"{sut_base_url}&action=IN")
        assert len(res1.data["results"]) == 1
        assert res1.data["results"][0]["action"] == "IN"

        # Act & Assert 2. Product name filter
        res2 = sut_client.get(f"{sut_base_url}&product_name={inventory_env.product_a1.name}")
        assert len(res2.data["results"]) == 1
        assert res2.data["results"][0]["items"][0]["product"]["name"] == "Product A1"
        assert res2.data["results"][0]["branch"] == inventory_env.branch_a1.id

        # Act & Assert 3. Product SKU filter
        res3 = sut_client.get(f"{sut_base_url_a2}&product_sku={inventory_env.product_a2.sku}")
        assert len(res3.data["results"]) == 1
        assert res3.data["results"][0]["items"][0]["product"]["sku"] == inventory_env.product_a2.sku
        assert res3.data["results"][0]["branch"] == inventory_env.branch_a2.id

        # Act & Assert 4. Branch filter
        res4 = sut_client.get(f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}")
        assert len(res4.data["results"]) == 1
        assert res4.data["results"][0]["branch"] == inventory_env.branch_a1.id

        # Act & Assert 5. From date filter
        res5 = sut_client.get(f"{sut_base_url}&from_date={from_date}")
        assert len(res5.data["results"]) == 1
        assert res5.data["results"][0]["created_at"][:10] == from_date

        # Act & Assert 6. To date filter
        res6 = sut_client.get(f"{sut_base_url_a2}&to_date={to_date}")
        assert len(res6.data["results"]) == 1
        assert res6.data["results"][0]["created_at"][:10] <= to_date

        # Act & Assert 7. Action + Branch
        res7 = sut_client.get(f"{reverse('inventorytransaction-list')}?action=IN&branch={inventory_env.branch_a1.id}")
        assert len(res7.data["results"]) == 1
        assert res7.data["results"][0]["action"] == "IN"
        assert res7.data["results"][0]["branch"] == inventory_env.branch_a1.id

        # Act & Assert 8. Product name + From date
        res8 = sut_client.get(f"{sut_base_url}&product_name={inventory_env.product_a1.name}&from_date={from_date}")
        assert len(res8.data["results"]) == 1
        assert res8.data["results"][0]["items"][0]["product"]["name"] == "Product A1"
        assert res8.data["results"][0]["branch"] == inventory_env.branch_a1.id
        assert res8.data["results"][0]["created_at"][:10] == from_date

        # Act & Assert 9. Product SKU + To date
        res9 = sut_client.get(f"{sut_base_url_a2}&product_sku={inventory_env.product_a2.sku}&to_date={to_date}")
        assert len(res9.data["results"]) == 1
        assert res9.data["results"][0]["items"][0]["product"]["sku"] == inventory_env.product_a2.sku
        assert res9.data["results"][0]["created_at"][:10] <= to_date
        assert res9.data["results"][0]["branch"] == inventory_env.branch_a2.id

        # Act & Assert 10. All combined
        res10 = sut_client.get(
            f"{sut_base_url}&action=IN&product_name={inventory_env.product_a1.name}&from_date={from_date}"
        )
        assert len(res10.data["results"]) == 1
        assert res10.data["results"][0]["items"][0]["product"]["name"] == "Product A1"
        assert res10.data["results"][0]["created_at"][:10] == from_date

    # --- PAGINATION TESTS ---

    def test_inventory_transaction_pagination(self, api_client, inventory_env):
        """Transaction pagination test."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=inventory_env.owner_a)
        for i in range(10):
            InventoryTransaction.objects.create(
                inventory=inventory_env.branch_a1.inventory,
                action=InventoryTransaction.Action.IN,
                description=f"Paginated {i}"
            )
        sut_url = f"{reverse('inventorytransaction-list')}?branch={inventory_env.branch_a1.id}"

        # Act
        sut_response1 = sut_client.get(sut_url)

        # Assert
        assert sut_response1.status_code == status.HTTP_200_OK
        assert len(sut_response1.data["results"]) == 6
        assert sut_response1.data["next"] is not None

        # Act
        sut_response2 = sut_client.get(sut_response1.data["next"])

        # Assert
        assert sut_response2.status_code == status.HTTP_200_OK
        assert len(sut_response2.data["results"]) == 4
        assert sut_response2.data["next"] is None
