from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from apps.supplier.models import SalesOrder, OrderStatus, SalesOrderItem
from apps.inventory.models import Inventory, InventoryProduct
from decimal import Decimal
from apps.employee.models import UserBusinessRole, UserRole
from django.test import override_settings

User = get_user_model()

@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class SalesOrderTests(APITransactionTestCase):
    def setUp(self):
        # Create Business
        self.business = Business.objects.create(name="Seller Corp", gst_number="27BBBBB1111B2Z2")
        self.branch = Branch.objects.create(business=self.business, name="Distribution Center", is_default=True)
        self.user = User.objects.create_user(username="seller", email="seller@test.com", password="password")
        UserBusinessRole.objects.create(user=self.user, business=self.business, role=UserRole.OWNER)
        
        # Generic Customer
        self.customer = BusinessCustomer.objects.create(
            business=self.business,
            name="Generic Customer",
            mobile_number="1234567890"
        )

        # Create Product
        self.sku = "SO-UNIT-001"
        self.product = Product.objects.create(
            business=self.business,
            name="SO Product",
            sku=self.sku,
            base_price=Decimal("15.00"),
            cost_price=Decimal("10.00"),
            input_gst_rate=18,
            output_gst_rate=18
        )

        self.client.force_authenticate(user=self.user)
        self.inventory, _ = Inventory.objects.get_or_create(branch=self.branch, defaults={'business': self.business})
        InventoryProduct.objects.get_or_create(inventory=self.inventory, product=self.product, defaults={'stock_quantity': 100})

    def test_so_delivery_updates_stock(self):
        """Test that marking an SO as DELIVERED updates stock (Action OUT)."""
        so = SalesOrder.objects.create(
            business=self.business,
            branch=self.branch,
            customer=self.customer,
            status=OrderStatus.PENDING,
            total_amount=100
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product,
            quantity=10,
            unit_price=Decimal("10.00")
        )

        url = f"/supplier/sales-order/{so.id}/deliver/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        so.refresh_from_db()
        self.assertEqual(so.status, OrderStatus.DELIVERED)

        stock = InventoryProduct.objects.get(inventory=self.inventory, product=self.product).stock_quantity
        self.assertEqual(stock, 90) # 100 - 10

    def test_so_edit_after_delivered_resyncs_stock(self):
        """Test that editing a DELIVERED SO reverts status to PENDING and reverses stock."""
        so = SalesOrder.objects.create(
            business=self.business,
            branch=self.branch,
            customer=self.customer,
            status=OrderStatus.DELIVERED,
            total_amount=100
        )
        item = SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product,
            quantity=10,
            unit_price=Decimal("10.00")
        )
        
        # Add initial stock and trigger delivery OUT manually
        from apps.supplier.utils.sales_order_inventory import update_sales_order_inventory_stock
        update_sales_order_inventory_stock(so, request=None)
        self.assertEqual(InventoryProduct.objects.get(inventory=self.inventory, product=self.product).stock_quantity, 90)

        # Edit via API
        url = reverse('sales-order-detail', kwargs={'pk': so.id})
        data = {
            "branch": self.branch.id,
            "customer": self.customer.id,
            "items": [
                {"id": item.id, "sku": self.sku, "quantity": 5, "unit_price": 10}
            ]
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        so.refresh_from_db()
        self.assertEqual(so.status, OrderStatus.PENDING)
        self.assertEqual(InventoryProduct.objects.get(inventory=self.inventory, product=self.product).stock_quantity, 100)

    def test_so_status_transition_restrictions(self):
        """Verify that DELIVERED SO cannot be CANCELLED and vice-versa."""
        so = SalesOrder.objects.create(
            business=self.business,
            branch=self.branch,
            customer=self.customer,
            status=OrderStatus.DELIVERED
        )
        url = reverse('sales-order-detail', kwargs={'pk': so.id})
        
        # DELIVERED -> CANCELLED
        response = self.client.patch(url, {"status": OrderStatus.CANCELLED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # CANCELLED -> DELIVERED
        so.status = OrderStatus.CANCELLED
        so.save()
        response = self.client.patch(url, {"status": OrderStatus.DELIVERED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
