from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.business.models import Business, Branch
from apps.product.models import Product
from apps.supplier.models import Supplier, PurchaseOrder, OrderStatus, PurchaseOrderItem
from apps.inventory.models import Inventory, InventoryTransaction, InventoryProduct
from decimal import Decimal
from apps.employee.models import UserBusinessRole, UserRole
from django.test import override_settings

User = get_user_model()

@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class PurchaseOrderTests(APITransactionTestCase):
    def setUp(self):
        # Create Business
        self.business = Business.objects.create(name="Buyer Ltd", gst_number="27AAAAA0000A1Z1")
        self.branch = Branch.objects.create(business=self.business, name="Main Branch", is_default=True)
        self.user = User.objects.create_user(username="buyer", email="buyer@test.com", password="password")
        UserBusinessRole.objects.create(user=self.user, business=self.business, role=UserRole.OWNER)
        
        # Generic Supplier
        self.supplier = Supplier.objects.create(
            business=self.business,
            name="Generic Supplier",
            mobile_number="9876543210"
        )

        # Create Product
        self.sku = "PO-UNIT-001"
        self.product = Product.objects.create(
            business=self.business,
            name="PO Product",
            sku=self.sku,
            base_price=Decimal("15.00"),
            cost_price=Decimal("10.00"),
            input_gst_rate=18,
            output_gst_rate=18
        )

        self.client.force_authenticate(user=self.user)
        self.inventory, _ = Inventory.objects.get_or_create(branch=self.branch, defaults={'business': self.business})
        InventoryProduct.objects.get_or_create(inventory=self.inventory, product=self.product, defaults={'stock_quantity': 0})

    def test_po_delivery_updates_stock(self):
        """Test that marking a PO as DELIVERED updates internal stock."""
        po = PurchaseOrder.objects.create(
            business=self.business,
            branch=self.branch,
            supplier=self.supplier,
            status=OrderStatus.PENDING,
            total_amount=100
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=self.product,
            quantity=10,
            unit_cost=Decimal("10.00")
        )

        url = reverse('purchase-order-delivered', kwargs={'pk': po.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        po.refresh_from_db()
        self.assertEqual(po.status, OrderStatus.DELIVERED)

        stock = InventoryProduct.objects.get(inventory=self.inventory, product=self.product).stock_quantity
        self.assertEqual(stock, 10)

    def test_po_edit_after_delivered_resyncs_stock(self):
        """Test that editing a DELIVERED PO reverts status to PENDING and reverses stock."""
        po = PurchaseOrder.objects.create(
            business=self.business,
            branch=self.branch,
            supplier=self.supplier,
            status=OrderStatus.DELIVERED,
            total_amount=100
        )
        item = PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=self.product,
            quantity=10,
            unit_cost=Decimal("10.00")
        )
        # Manually trigger initial stock IN
        from apps.supplier.utils.purchase_order_inventory import update_purchase_order_inventory_stock
        update_purchase_order_inventory_stock(po, request=None)

        self.assertEqual(InventoryProduct.objects.get(inventory=self.inventory, product=self.product).stock_quantity, 10)

        # Edit via API
        url = reverse('purchase-order-detail', kwargs={'pk': po.id})
        data = {
            "branch_id": self.branch.id,
            "supplier": self.supplier.id,
            "items": [
                {"id": item.id, "product_id": self.product.id, "quantity": 15, "unit_cost": 10}
            ]
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        po.refresh_from_db()
        self.assertEqual(po.status, OrderStatus.PENDING)
        self.assertEqual(InventoryProduct.objects.get(inventory=self.inventory, product=self.product).stock_quantity, 0)

    def test_po_status_transition_restrictions(self):
        """Verify that DELIVERED PO cannot be CANCELLED and vice-versa."""
        po = PurchaseOrder.objects.create(
            business=self.business,
            branch=self.branch,
            supplier=self.supplier,
            status=OrderStatus.DELIVERED
        )
        url = reverse('purchase-order-detail', kwargs={'pk': po.id})
        
        # DELIVERED -> CANCELLED
        response = self.client.patch(url, {"status": OrderStatus.CANCELLED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # CANCELLED -> DELIVERED
        po.status = OrderStatus.CANCELLED
        po.save()
        response = self.client.patch(url, {"status": OrderStatus.DELIVERED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
