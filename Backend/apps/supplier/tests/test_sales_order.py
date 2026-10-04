from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.supplier.models import SalesOrder, OrderStatus
from apps.activity_log.models import ActivityLog
from apps.business.models import BusinessCustomer
from apps.employee.models import WorkType


class SalesOrderTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.url = reverse('sales-order-list')
        
        # Customer
        self.customer_a1 = BusinessCustomer.objects.create(
            business=self.business_a,
            name="Customer A1",
            mobile_number="1111111111"
        )
        self.customer_b1 = BusinessCustomer.objects.create(
            business=self.business_b,
            name="Customer B1",
            mobile_number="2222222222"
        )
        
        self.order_data = {
            "customer_id": self.customer_a1.id,
            "branch_id": self.branch_a1.id,
            "notes": "Test Sales Order",
            "items": [
                {
                    "sku": self.product_a1.sku,
                    "quantity": 10,
                    "price": 100.0
                }
            ]
        }

    def verify_order_data(self, response_data, expected_data):
        self.assertEqual(response_data['notes'], expected_data['notes'])
        self.assertEqual(response_data['branch']['id'], expected_data['branch_id'])
        self.assertEqual(response_data['customer']['id'], expected_data['customer_id'])
        
        # Items check
        self.assertEqual(len(response_data['items']), len(expected_data['items']))
        for i in range(len(expected_data['items'])):
            self.assertEqual(response_data['items'][i]['product']['sku'], expected_data['items'][i]['sku'])
            self.assertEqual(response_data['items'][i]['quantity'], expected_data['items'][i]['quantity'])
            self.assertEqual(float(response_data['items'][i]['price']), float(expected_data['items'][i]['price']))

    def test_sales_order_crud_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        response = self.client.post(self.url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_order_data(response.data, self.order_data)
        order_id = response.data['id']
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.SUPPLIER)

        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)

        # Read
        detail_url = reverse('sales-order-detail', kwargs={'pk': order_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verify_order_data(response.data, self.order_data)

        # Update
        response = self.client.patch(detail_url, {"notes": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['notes'], "Updated")
        self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.SUPPLIER)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SalesOrder.objects.filter(id=order_id).exists())
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.SUPPLIER)

    def test_sales_order_crud_by_manager_on_assigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Create
        response = self.client.post(self.url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_order_data(response.data, self.order_data)
        order_id = response.data['id']
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

        # Read
        detail_url = reverse('sales-order-detail', kwargs={'pk': order_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verify_order_data(response.data, self.order_data)

        # Update
        response = self.client.patch(detail_url, {"notes": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['notes'], "Updated")

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SalesOrder.objects.filter(id=order_id).exists())

    def test_sales_order_crud_by_manager_on_unassigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Create
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_a2.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Create
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # List
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data['results']), 1)
        for order in response.data['results']:
            self.assertNotEqual(order['branch']['id'], self.branch_a2.id)

    def test_sales_order_crud_by_employee_on_assigned_branch_without_permission(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        response = self.client.post(self.url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_order_crud_by_employee_on_assigned_branch_with_permission(self):
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.SUPPLIER)
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        response = self.client.post(self.url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_order_data(response.data, self.order_data)
        order_id = response.data['id']

        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

        # Read
        detail_url = reverse('sales-order-detail', kwargs={'pk': order_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verify_order_data(response.data, self.order_data)

        # Update
        response = self.client.patch(detail_url, {"notes": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['notes'], "Updated")

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SalesOrder.objects.filter(id=order_id).exists())

    def test_sales_order_crud_by_employee_on_unassigned_branch_with_permission(self):
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.SUPPLIER)
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_a2.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Read/Update/Delete (Should be 404 since it's not in their queryset)
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_a2.id})
        
        self.client.force_authenticate(user=self.employee_a1)
        # Read
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Update
        response = self.client.patch(detail_url, {"notes": "Update me"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_order_crud_by_employee_on_unassigned_branch_without_permission(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_a2.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Read/Update/Delete (Should be 403)
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_a2.id})
        
        self.client.force_authenticate(user=self.employee_a1)
        # Read
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Update
        response = self.client.patch(detail_url, {"notes": "Update me"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_order_delivered_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Use existing so_a1
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_a1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status update
        self.so_a1.refresh_from_db()
        self.assertEqual(self.so_a1.status, OrderStatus.DELIVERED)

    def test_sales_order_delivered_by_manager(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Use so_a1 on assigned branch
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_a1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status update
        self.so_a1.refresh_from_db()
        self.assertEqual(self.so_a1.status, OrderStatus.DELIVERED)

    def test_sales_order_validation_error_missing_items(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        payload = self.order_data.copy()
        payload.pop('items')
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_order_validation_error_invalid_status_transition(self):
        self.client.force_authenticate(user=self.owner_a)
        
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_a1.id})
        
        # Update
        self.client.patch(detail_url, {"status": OrderStatus.CANCELLED}, format='json')
        
        # Verify status update
        self.so_a1.refresh_from_db()
        self.assertEqual(self.so_a1.status, OrderStatus.CANCELLED)

        # Try to deliver a cancelled order
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_a1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Cancelled orders cannot be delivered.")

    def test_sales_order_create_without_branch_success(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        payload = self.order_data.copy()
        payload.pop('branch_id')
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_sales_order_status_validation_failed_update(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Manually set to FAILED
        SalesOrder.objects.filter(id=self.so_a1.id).update(status=OrderStatus.FAILED)
        
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_a1.id})
        # Must pass status to trigger validate_status
        response = self.client.patch(detail_url, {"status": OrderStatus.FAILED, "notes": "Trying to update"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_order_status_validation_delivered_to_cancelled(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Manually set to DELIVERED
        SalesOrder.objects.filter(id=self.so_a1.id).update(status=OrderStatus.DELIVERED)
        
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_a1.id})
        response = self.client.patch(detail_url, {"status": OrderStatus.CANCELLED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_order_status_validation_cancelled_to_delivered(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Manually set to CANCELLED
        SalesOrder.objects.filter(id=self.so_a1.id).update(status=OrderStatus.CANCELLED)
        
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_a1.id})
        response = self.client.patch(detail_url, {"status": OrderStatus.DELIVERED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_order_crud_by_owner_on_other_business(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create (Should fail due to invalid branch/customer)
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_b1.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        payload = self.order_data.copy()
        payload['customer_id'] = self.customer_b1.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # List (Should not show so_b1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [order['id'] for order in response.data['results']]
        self.assertNotIn(self.so_b1.id, order_ids)

        # Read (Should be 404)
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_b1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Update (Should be 404)
        response = self.client.patch(detail_url, {"notes": "Update me"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Delete (Should be 404)
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_order_crud_by_manager_on_other_business(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Create
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_b1.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Read/Update/Delete (so_b1 belongs to Business B)
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_b1.id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.patch(detail_url, {"notes": "Update me"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_order_crud_by_employee_without_permission_on_other_business(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # Everything should be 403 because they lack base supplier permissions
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_b1.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_b1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_order_crud_by_employee_with_permission_on_other_business(self):
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.SUPPLIER)
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        payload = self.order_data.copy()
        payload['branch_id'] = self.branch_b1.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Read/Update/Delete (so_b1 is outside Business A)
        detail_url = reverse('sales-order-detail', kwargs={'pk': self.so_b1.id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.patch(detail_url, {"notes": "Update me"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_order_deliver_by_owner_on_other_business(self):
        self.client.force_authenticate(user=self.owner_a)
        
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_b1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_order_deliver_by_manager_on_other_business(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_b1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_order_deliver_by_employee_without_permission_on_other_business(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_b1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_order_deliver_by_employee_with_permission_on_other_business(self):
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.SUPPLIER)
        self.client.force_authenticate(user=self.employee_a1)
        
        deliver_url = reverse('sales-order-deliver', kwargs={'pk': self.so_b1.id})
        response = self.client.post(deliver_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- FILTERING TESTS ---

    def test_sales_order_filtering_combinations(self):
        self.client.force_authenticate(user=self.owner_a)
        from django.utils import timezone
        from datetime import timedelta
        
        # Today's order
        SalesOrder.objects.filter(id=self.so_a1.id).update(
            order_date=timezone.now().date(),
            status=OrderStatus.PENDING
        )
        
        # Yesterday's order
        SalesOrder.objects.filter(id=self.so_a2.id).update(
            order_date=timezone.now().date() - timedelta(days=1),
            status=OrderStatus.DELIVERED
        )
        
        # Extra order (Customer A1)
        so_extra = SalesOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            customer=self.customer_a1,
            status=OrderStatus.CANCELLED
        )
        SalesOrder.objects.filter(id=so_extra.id).update(
            order_date=timezone.now().date() - timedelta(days=2)
        )
        
        # 1. Filter by Branch
        response = self.client.get(f"{self.url}?branch={self.branch_a1.id}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["branch"]["id"], self.branch_a1.id)
        self.assertEqual(response.data["results"][1]["branch"]["id"], self.branch_a1.id)
        
        # 2. Filter by Status
        response = self.client.get(f"{self.url}?status={OrderStatus.DELIVERED}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.so_a2.id)
        self.assertEqual(response.data["results"][0]["status"], OrderStatus.DELIVERED)

        # 3. Filter by Customer Name (icontains)
        response = self.client.get(f"{self.url}?customer_name=customer a1")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], so_extra.id)
        self.assertEqual(response.data["results"][0]["customer"]["id"], self.customer_a1.id)

        # 4. Date After (gte)
        after_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        response = self.client.get(f"{self.url}?order_date_after={after_date}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertGreaterEqual(response.data["results"][0]["order_date"], after_date)
        self.assertGreaterEqual(response.data["results"][1]["order_date"], after_date)

        # 5. Date Before (lte)
        before_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        response = self.client.get(f"{self.url}?order_date_before={before_date}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertLessEqual(response.data["results"][0]["order_date"], before_date)
        self.assertLessEqual(response.data["results"][1]["order_date"], before_date)

        # 6. Branch + Status
        response = self.client.get(f"{self.url}?branch={self.branch_a1.id}&status={OrderStatus.PENDING}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["branch"]["id"], self.branch_a1.id)
        self.assertEqual(response.data["results"][0]["status"], OrderStatus.PENDING)


        # 7. Branch + Date Range
        response = self.client.get(f"{self.url}?branch={self.branch_a1.id}&order_date_after={after_date}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["branch"]["id"], self.branch_a1.id)
        self.assertGreaterEqual(response.data["results"][0]["order_date"], after_date)

        # 8. Status + Customer Name
        response = self.client.get(f"{self.url}?status={OrderStatus.CANCELLED}&customer_name=A1")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["status"], OrderStatus.CANCELLED)
        self.assertEqual(response.data["results"][0]["customer"]["id"], self.customer_a1.id)

        # 9. Date Range + Customer Name
        response = self.client.get(f"{self.url}?order_date_before={after_date}&customer_name=Customer A1")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertLessEqual(response.data["results"][0]["order_date"], before_date)
        self.assertEqual(response.data["results"][0]["customer"]["id"], self.customer_a1.id)

        # 10. All filters combined
        response = self.client.get(
            f"{self.url}?branch={self.branch_a1.id}&status={OrderStatus.PENDING}&customer_name=Customer"
        )
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["branch"]["id"], self.branch_a1.id)
        self.assertEqual(response.data["results"][0]["status"], OrderStatus.PENDING)
        self.assertEqual(response.data["results"][0]["customer"]["id"], self.customer_a.id)


    # --- PAGINATION TESTS ---

    def test_sales_order_pagination(self):
        self.client.force_authenticate(user=self.owner_a)
        # Seed 7 orders total
        for i in range(5):
            SalesOrder.objects.create(
                business=self.business_a,
                branch=self.branch_a1,
                customer=self.customer_a
            )
        
        # 1. Page 1
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        # Page size 6
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])
        
        # 2. Page 2
        next_url = response.data["next"]
        response = self.client.get(next_url)
        self.assertEqual(response.status_code, 200)
        # Remaining order
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])
