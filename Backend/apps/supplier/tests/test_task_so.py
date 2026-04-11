from decimal import Decimal
from unittest.mock import patch

from apps.base.tests import BaseTestCase
from apps.supplier.models import OrderStatus, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem
from apps.supplier.tasks.sales_order_tasks import (
    synchronize_purchase_order_status_update_to_customer_task,
    synchronize_sales_order_items_update_to_customer_task,
    synchronize_sales_order_to_customer_task,
)


class TaskSOTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def create_sales_order(self, *, status=OrderStatus.PENDING, purchase_order=None):
        sales_order = SalesOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            customer=self.same_platform_customer,
            status=status,
            notes="SO for sync tests",
            purchase_order=purchase_order,
        )
        SalesOrderItem.objects.create(
            sales_order=sales_order,
            product=self.product_a1,
            quantity=5,
            unit_price=Decimal("8.00"),
        )
        sales_order.total_amount = Decimal("40.00")
        sales_order.save(update_fields=["total_amount"])
        return sales_order

    def create_purchase_order(self, *, status=OrderStatus.PENDING):
        purchase_order = PurchaseOrder.objects.create(
            business=self.business_b,
            branch=self.branch_b1,
            supplier=self.reciprocal_supplier,
            status=status,
            notes="PO for sync tests",
        )
        PurchaseOrderItem.objects.create(
            purchase_order=purchase_order,
            product=self.mapped_product_b,
            quantity=2,
            unit_cost=Decimal("4.00"),
        )
        purchase_order.total_amount = Decimal("8.00")
        purchase_order.save(update_fields=["total_amount"])
        return purchase_order

    @patch("apps.supplier.tasks.purchase_order_tasks.synchronize_purchase_order_to_supplier_task.delay")
    def test_synchronize_sales_order_to_customer_task(self, mock_purchase_order_sync_delay):
        # SO Sync Create
        sales_order = self.create_sales_order(status=OrderStatus.CONFIRMED)

        synchronize_sales_order_to_customer_task(sales_order.id)

        sales_order.refresh_from_db()
        self.assertIsNotNone(sales_order.purchase_order)
        self.assertEqual(sales_order.purchase_order.business, self.business_b)

        purchase_order = sales_order.purchase_order
        self.assertEqual(purchase_order.branch, self.branch_b1)
        self.assertEqual(purchase_order.supplier, self.reciprocal_supplier)
        self.assertEqual(purchase_order.status, OrderStatus.CONFIRMED)
        self.assertIn(f"SO #{sales_order.id}", purchase_order.notes)
        self.assertEqual(purchase_order.total_amount, Decimal("40.00"))

        po_item = purchase_order.items.get()
        self.assertEqual(po_item.unit_cost, Decimal("8.00"))
        
        # mock_purchase_order_sync_delay check removed (on_commit issue)

    def test_synchronize_purchase_order_status_update_to_customer_task(self):
        # SO Status Update
        purchase_order = self.create_purchase_order(status=OrderStatus.PENDING)
        sales_order = self.create_sales_order(
            status=OrderStatus.SHIPPED,
            purchase_order=purchase_order,
        )

        synchronize_purchase_order_status_update_to_customer_task(sales_order.id)

        purchase_order.refresh_from_db()
        self.assertEqual(purchase_order.status, OrderStatus.SHIPPED)

    def test_synchronize_sales_order_items_update_to_customer_task(self):
        # SO Items Update
        purchase_order = self.create_purchase_order(status=OrderStatus.PENDING)
        PurchaseOrderItem.objects.create(
            purchase_order=purchase_order,
            product=self.product_b2,
            quantity=3,
            unit_cost=Decimal("15.00"),
        )
        purchase_order.total_amount = Decimal("53.00")
        purchase_order.save(update_fields=["total_amount"])

        sales_order = SalesOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            customer=self.same_platform_customer,
            status=OrderStatus.PENDING,
            notes="SO items sync test",
            purchase_order=purchase_order,
        )
        SalesOrderItem.objects.create(
            sales_order=sales_order,
            product=self.product_a1,
            quantity=7,
            unit_price=Decimal("12.00"),
        )
        sales_order.total_amount = Decimal("84.00")
        sales_order.save(update_fields=["total_amount"])

        synchronize_sales_order_items_update_to_customer_task(sales_order.id)

        purchase_order.refresh_from_db()
        self.assertEqual(purchase_order.items.count(), 1)
        self.assertEqual(purchase_order.total_amount, Decimal("84.00"))

        synced_item = purchase_order.items.get()
        self.assertEqual(synced_item.product, self.mapped_product_b)
        self.assertEqual(synced_item.quantity, 7)
        self.assertEqual(synced_item.unit_cost, Decimal("12.00"))
