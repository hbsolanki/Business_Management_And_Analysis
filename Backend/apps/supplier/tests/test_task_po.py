from decimal import Decimal
from unittest.mock import patch

from apps.base.tests import BaseTestCase
from apps.supplier.models import (
    OrderStatus, 
    PurchaseOrder, 
    PurchaseOrderItem, 
    SalesOrder, 
    SalesOrderItem,
    Supplier
)
from apps.supplier.tasks.purchase_order_tasks import (
    synchronize_purchase_order_items_update_to_supplier_task,
    synchronize_purchase_order_status_update_to_supplier_task,
    synchronize_purchase_order_to_supplier_task,
)


class TaskPOTestCase(BaseTestCase):
    """
    Test suite for Purchase Order synchronization tasks.
    Tests the logic of the task functions directly.
    """

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        
        # Ensure Business A has a same-platform supplier pointing to Business B
        self.supplier_a_to_b = Supplier.objects.create(
            business=self.business_a,
            supplier_business=self.business_b,
            name="Supplier B (Same Platform)",
            mobile_number="9000000010",
            same_platform=True
        )
        
        # Ensure Business B has a same-platform customer pointing to Business A
        self.customer_b.customer_business = self.business_a
        self.customer_b.same_platform = True
        self.customer_b.save()

    @patch("apps.supplier.tasks.sales_order_tasks.synchronize_sales_order_to_customer_task.delay")
    def test_purchase_order_to_supplier_task(self, mock_sales_order_sync_delay):
        # PO Sync Create
        # Create a PO in Business A for Supplier B
        po = PurchaseOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            supplier=self.supplier_a_to_b,
            status=OrderStatus.CONFIRMED,
            notes="PO A to B sync test"
        )
        # PRD-A1 in Business A has SKU "PRD-A1"
        # PRD-A1 in Business B has SKU "PRD-A1"
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=self.product_a1, 
            quantity=10,
            unit_cost=Decimal("5.00")
        )
        po.total_amount = Decimal("50.00")
        po.save()

        # Call function directly
        synchronize_purchase_order_to_supplier_task(po.id)

        # 1. Verify SalesOrder created in Business B
        so = SalesOrder.objects.get(purchase_order=po)
        self.assertEqual(so.business, self.business_b)
        self.assertEqual(so.branch, self.branch_b1) # First branch of Business B
        self.assertEqual(so.customer, self.customer_b)
        self.assertEqual(so.status, OrderStatus.CONFIRMED)
        self.assertEqual(so.total_amount, Decimal("50.00"))

        # 2. Verify Items created in Business B
        so_item = so.items.get()
        self.assertEqual(so_item.product, self.product_b1) # Mapped by SKU "PRD-A1"
        self.assertEqual(so_item.quantity, 10)
        self.assertEqual(so_item.unit_price, Decimal("5.00"))

    def test_synchronize_purchase_order_status_update_to_supplier_task(self):
        # PO Status Update
        po = PurchaseOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            supplier=self.supplier_a_to_b,
            status=OrderStatus.PENDING
        )
        # Manually link an SO in Business B
        so = SalesOrder.objects.create(
            business=self.business_b,
            branch=self.branch_b1,
            customer=self.customer_b,
            status=OrderStatus.PENDING,
            purchase_order=po
        )

        # Update PO status and sync
        po.status = OrderStatus.SHIPPED
        po.save(update_fields=["status"])

        synchronize_purchase_order_status_update_to_supplier_task(po.id)

        so.refresh_from_db()
        self.assertEqual(so.status, OrderStatus.SHIPPED)

    def test_synchronize_purchase_order_items_update_to_supplier_task(self):
        # PO Items Update
        po = PurchaseOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            supplier=self.supplier_a_to_b,
            status=OrderStatus.PENDING
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=self.product_a1, # SKU: PRD-A1
            quantity=20,
            unit_cost=Decimal("15.00")
        )
        po.total_amount = Decimal("300.00")
        po.save()

        # Linked SO in Business B with mismatched data
        so = SalesOrder.objects.create(
            business=self.business_b,
            branch=self.branch_b1,
            customer=self.customer_b,
            status=OrderStatus.PENDING,
            purchase_order=po
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product_b1, # SKU: PRD-A1
            quantity=2,
            unit_price=Decimal("10.00")
        )
        so.total_amount = Decimal("20.00")
        so.save()

        # Sync items
        synchronize_purchase_order_items_update_to_supplier_task(po.id)

        so.refresh_from_db()
        self.assertEqual(so.items.count(), 1)
        self.assertEqual(so.total_amount, Decimal("300.00"))

        synced_item = so.items.get()
        self.assertEqual(synced_item.product, self.product_b1)
        self.assertEqual(synced_item.quantity, 20)
        self.assertEqual(synced_item.unit_price, Decimal("15.00"))
