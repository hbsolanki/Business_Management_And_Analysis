import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.supplier.models import PurchaseOrder, OrderStatus
from apps.activity_log.models import ActivityLog
from apps.employee.models import WorkType
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def po_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.url = reverse('purchase-order-list')
    tc.supplier = tc.supplier_a1
    tc.product = tc.product_a1
    tc.order_data = {
        "supplier_id": tc.supplier.id,
        "branch_id": tc.branch_a1.id,
        "notes": "Test Order",
        "items": [
            {
                "product_id": tc.product.id,
                "quantity": 5,
                "price": 8.0
            }
        ]
    }
    return tc


def verify_order_data(response_data, expected_data):
    assert response_data['notes'] == expected_data['notes']
    assert response_data['branch']['id'] == expected_data['branch_id']
    assert response_data['supplier']['id'] == expected_data['supplier_id']
    assert len(response_data['items']) == len(expected_data['items'])
    for i in range(len(expected_data['items'])):
        assert response_data['items'][i]['product']['id'] == expected_data['items'][i]['product_id']
        assert response_data['items'][i]['quantity'] == expected_data['items'][i]['quantity']
        assert float(response_data['items'][i]['price']) == float(expected_data['items'][i]['price'])


@pytest.mark.django_db
class TestPurchaseOrder:

    def test_purchase_order_crud_by_owner(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        sut_list_url = po_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_list_url, po_env.order_data, format='json')

        # Assert - Create
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        verify_order_data(sut_create_res.data, po_env.order_data)
        order_id = sut_create_res.data['id']
        po_env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.SUPPLIER)

        # Act - List
        sut_list_res = api_client.get(sut_list_url)

        # Assert - List
        assert sut_list_res.status_code == status.HTTP_200_OK
        assert len(sut_list_res.data['results']) == 3

        # Arrange - Detail
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': order_id})

        # Act - Read
        sut_read_res = api_client.get(sut_detail_url)

        # Assert - Read
        assert sut_read_res.status_code == status.HTTP_200_OK
        verify_order_data(sut_read_res.data, po_env.order_data)

        # Act - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"notes": "Updated"}, format='json')

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK
        assert sut_patch_res.data['notes'] == "Updated"
        po_env._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.SUPPLIER)

        # Act - Delete
        sut_del_res = api_client.delete(sut_detail_url)

        # Assert - Delete
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not PurchaseOrder.objects.filter(id=order_id).exists()
        po_env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.SUPPLIER)

    def test_purchase_order_crud_by_manager_on_assigned_branch(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.manager_a1)
        sut_list_url = po_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_list_url, po_env.order_data, format='json')
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        verify_order_data(sut_create_res.data, po_env.order_data)
        order_id = sut_create_res.data['id']

        # Act & Assert - List
        sut_list_res = api_client.get(sut_list_url)
        assert sut_list_res.status_code == status.HTTP_200_OK
        assert len(sut_list_res.data['results']) == 2

        # Act & Assert - Read, Update, Delete
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': order_id})
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK
        assert api_client.patch(sut_detail_url, {"notes": "Updated"}, format='json').status_code == status.HTTP_200_OK
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT
        assert not PurchaseOrder.objects.filter(id=order_id).exists()

    def test_purchase_order_crud_by_manager_on_unassigned_branch(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.manager_a1)
        payload = po_env.order_data.copy()
        payload['branch_id'] = po_env.branch_a2.id
        sut_list_url = po_env.url
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a2.id})

        # Act & Assert - Create, Read, Update, Delete
        assert api_client.post(sut_list_url, payload, format='json').status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
        assert api_client.get(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_detail_url, {"notes": "Update me"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_crud_by_employee_on_assigned_branch_without_permission(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.employee_a1)
        sut_list_url = po_env.url
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a1.id})

        # Act & Assert
        assert api_client.post(sut_list_url, po_env.order_data, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(sut_list_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(sut_detail_url, {"notes": "Updated"}, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_purchase_order_crud_by_employee_on_assigned_branch_with_permission(self, api_client, po_env):
        # Arrange
        po_env.assign_work_to_user(po_env.employee_a1, po_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=po_env.employee_a1)
        sut_list_url = po_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_list_url, po_env.order_data, format='json')
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        verify_order_data(sut_create_res.data, po_env.order_data)
        order_id = sut_create_res.data['id']

        # Act & Assert - List
        assert api_client.get(sut_list_url).status_code == status.HTTP_200_OK

        # Act & Assert - Read, Update, Delete
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': order_id})
        assert api_client.get(sut_detail_url).status_code == status.HTTP_200_OK
        assert api_client.patch(sut_detail_url, {"notes": "Updated"}, format='json').status_code == status.HTTP_200_OK
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_204_NO_CONTENT
        assert not PurchaseOrder.objects.filter(id=order_id).exists()

    def test_purchase_order_crud_by_employee_on_unassigned_branch_with_permission(self, api_client, po_env):
        # Arrange
        po_env.assign_work_to_user(po_env.employee_a1, po_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=po_env.employee_a1)
        payload = po_env.order_data.copy()
        payload['branch_id'] = po_env.branch_a2.id
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a2.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
        assert api_client.get(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(sut_detail_url, {"notes": "Update me"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_crud_by_employee_on_unassigned_branch_without_permission(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.employee_a1)
        payload = po_env.order_data.copy()
        payload['branch_id'] = po_env.branch_a2.id
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a2.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(sut_detail_url, {"notes": "Update me"}, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(sut_detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_purchase_order_delivered_by_owner(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        sut_delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.post(sut_delivered_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        po_env.po_a1.refresh_from_db()
        assert po_env.po_a1.status == OrderStatus.DELIVERED

    def test_purchase_order_delivered_by_manager(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.manager_a1)
        sut_delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.post(sut_delivered_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        po_env.po_a1.refresh_from_db()
        assert po_env.po_a1.status == OrderStatus.DELIVERED

    def test_purchase_order_delivered_by_employee_without_permission(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.employee_a1)
        sut_delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.post(sut_delivered_url)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_purchase_order_delivered_by_employee_with_permission(self, api_client, po_env):
        # Arrange
        po_env.assign_work_to_user(po_env.employee_a1, po_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=po_env.employee_a1)
        sut_delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.post(sut_delivered_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        po_env.po_a1.refresh_from_db()
        assert po_env.po_a1.status == OrderStatus.DELIVERED

    def test_purchase_order_validation_error_missing_items(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        payload = po_env.order_data.copy()
        payload.pop('items')
        sut_detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a1.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.patch(sut_detail_url, {"items": []}, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_purchase_order_validation_error_missing_supplier(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        payload = po_env.order_data.copy()
        payload.pop('supplier_id')

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST

    def test_purchase_order_create_without_branch_success(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        payload = po_env.order_data.copy()
        payload.pop('branch_id')

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_201_CREATED

    def test_purchase_order_validation_error_invalid_status_transition(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a1.id})
        api_client.patch(detail_url, {"status": OrderStatus.CANCELLED}, format='json')
        po_env.po_a1.refresh_from_db()
        assert po_env.po_a1.status == OrderStatus.CANCELLED

        # Act
        delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_a1.id})
        sut_response = api_client.post(delivered_url)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert sut_response.data['error'] == "Cancelled orders cannot be received."

    def test_purchase_order_status_validation_failed_update(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        PurchaseOrder.objects.filter(id=po_env.po_a1.id).update(status=OrderStatus.FAILED)
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.patch(detail_url, {"status": OrderStatus.FAILED, "notes": "Trying to update"}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_purchase_order_status_validation_delivered_to_cancelled(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        PurchaseOrder.objects.filter(id=po_env.po_a1.id).update(status=OrderStatus.DELIVERED)
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.patch(detail_url, {"status": OrderStatus.CANCELLED}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_purchase_order_status_validation_cancelled_to_delivered(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        PurchaseOrder.objects.filter(id=po_env.po_a1.id).update(status=OrderStatus.CANCELLED)
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_a1.id})

        # Act
        sut_response = api_client.patch(detail_url, {"status": OrderStatus.DELIVERED}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_purchase_order_crud_by_owner_on_other_business(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        payload1 = po_env.order_data.copy()
        payload1['branch_id'] = po_env.branch_b1.id
        payload2 = po_env.order_data.copy()
        payload2['supplier_id'] = po_env.supplier_b1.id
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload1, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.post(po_env.url, payload2, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(detail_url, {"notes": "Update me"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_crud_by_manager_on_other_business(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.manager_a1)
        payload = po_env.order_data.copy()
        payload['branch_id'] = po_env.branch_b1.id
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(detail_url, {"notes": "Update me"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_crud_by_employee_without_permission_on_other_business(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.employee_a1)
        payload = po_env.order_data.copy()
        payload['branch_id'] = po_env.branch_b1.id
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_purchase_order_crud_by_employee_with_permission_on_other_business(self, api_client, po_env):
        # Arrange
        po_env.assign_work_to_user(po_env.employee_a1, po_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=po_env.employee_a1)
        payload = po_env.order_data.copy()
        payload['branch_id'] = po_env.branch_b1.id
        detail_url = reverse('purchase-order-detail', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(po_env.url, payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        assert api_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert api_client.patch(detail_url, {"notes": "Update me"}, format='json').status_code == status.HTTP_404_NOT_FOUND
        assert api_client.delete(detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_delivered_by_owner_on_other_business(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(delivered_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_delivered_by_manager_on_other_business(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.manager_a1)
        delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(delivered_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_delivered_by_employee_without_permission_on_other_business(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.employee_a1)
        delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(delivered_url).status_code == status.HTTP_403_FORBIDDEN

    def test_purchase_order_delivered_by_employee_with_permission_on_other_business(self, api_client, po_env):
        # Arrange
        po_env.assign_work_to_user(po_env.employee_a1, po_env.branch_a1, WorkType.SUPPLIER)
        api_client.force_authenticate(user=po_env.employee_a1)
        delivered_url = reverse('purchase-order-delivered', kwargs={'pk': po_env.po_b1.id})

        # Act & Assert
        assert api_client.post(delivered_url).status_code == status.HTTP_404_NOT_FOUND

    def test_purchase_order_filtering_combinations(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)

        PurchaseOrder.objects.filter(id=po_env.po_a1.id).update(
            order_date=timezone.now().date(),
            status=OrderStatus.PENDING
        )
        PurchaseOrder.objects.filter(id=po_env.po_a2.id).update(
            order_date=timezone.now().date() - timedelta(days=1),
            status=OrderStatus.DELIVERED
        )
        po_extra = PurchaseOrder.objects.create(
            business=po_env.business_a,
            branch=po_env.branch_a1,
            supplier=po_env.supplier_a1,
            status=OrderStatus.CANCELLED
        )
        PurchaseOrder.objects.filter(id=po_extra.id).update(
            order_date=timezone.now().date() - timedelta(days=2)
        )

        sut_url = po_env.url

        # Act & Assert - 1. Filter by Branch
        res1 = api_client.get(f"{sut_url}?branch={po_env.branch_a1.id}")
        assert len(res1.data["results"]) == 2

        # Act & Assert - 2. Filter by Status
        res2 = api_client.get(f"{sut_url}?status={OrderStatus.DELIVERED}")
        assert len(res2.data["results"]) == 1
        assert res2.data["results"][0]["id"] == po_env.po_a2.id

        # Act & Assert - 3. Filter by Supplier Name
        res3 = api_client.get(f"{sut_url}?supplier_name=supplier a1")
        assert len(res3.data["results"]) == 3

        # Act & Assert - 4. Date After
        after_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        res4 = api_client.get(f"{sut_url}?order_date_after={after_date}")
        assert len(res4.data["results"]) == 2

        # Act & Assert - 5. Date Before
        before_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        res5 = api_client.get(f"{sut_url}?order_date_before={before_date}")
        assert len(res5.data["results"]) == 2

        # Act & Assert - 6. Branch + Status
        res6 = api_client.get(f"{sut_url}?branch={po_env.branch_a1.id}&status={OrderStatus.PENDING}")
        assert len(res6.data["results"]) == 1

        # Act & Assert - 7. All filters
        res7 = api_client.get(
            f"{sut_url}?branch={po_env.branch_a1.id}&status={OrderStatus.PENDING}&supplier_name=Supplier"
        )
        assert len(res7.data["results"]) == 1

    def test_purchase_order_pagination(self, api_client, po_env):
        # Arrange
        api_client.force_authenticate(user=po_env.owner_a)
        for i in range(5):
            PurchaseOrder.objects.create(
                business=po_env.business_a,
                branch=po_env.branch_a1,
                supplier=po_env.supplier_a1
            )
        sut_url = po_env.url

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
