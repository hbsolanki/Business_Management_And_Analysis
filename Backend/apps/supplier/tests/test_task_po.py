import pytest
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


@pytest.fixture
def task_po_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()

    tc.supplier_a_to_b = Supplier.objects.create(
        business=tc.business_a,
        supplier_business=tc.business_b,
        name="Supplier B (Same Platform)",
        mobile_number="9000000010",
        same_platform=True
    )

    tc.customer_b.customer_business = tc.business_a
    tc.customer_b.same_platform = True
    tc.customer_b.save()
    return tc


@pytest.mark.django_db
class TestTaskPO:

    @patch("apps.supplier.tasks.sales_order_tasks.synchronize_sales_order_to_customer_task.delay")
    def test_purchase_order_to_supplier_task(self, mock_sales_order_sync_delay, task_po_env):
        # Arrange
        po = PurchaseOrder.objects.create(
            business=task_po_env.business_a,
            branch=task_po_env.branch_a1,
            supplier=task_po_env.supplier_a_to_b,
            status=OrderStatus.CONFIRMED,
            notes="PO A to B sync test"
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=task_po_env.product_a1, 
            quantity=10,
            price=Decimal("5.00")
        )
        po.total_amount = Decimal("50.00")
        po.save()

        # Act
        synchronize_purchase_order_to_supplier_task(po.id)

        # Assert
        so = SalesOrder.objects.get(purchase_order=po)
        assert so.business == task_po_env.business_b
        assert so.branch == task_po_env.branch_b1
        assert so.customer == task_po_env.customer_b
        assert so.status == OrderStatus.CONFIRMED
        assert so.total_amount == Decimal("59.00")

        so_item = so.items.get()
        assert so_item.product == task_po_env.product_b1
        assert so_item.quantity == 10
        assert so_item.price == Decimal("5.00")

    def test_synchronize_purchase_order_status_update_to_supplier_task(self, task_po_env):
        # Arrange
        po = PurchaseOrder.objects.create(
            business=task_po_env.business_a,
            branch=task_po_env.branch_a1,
            supplier=task_po_env.supplier_a_to_b,
            status=OrderStatus.PENDING
        )
        so = SalesOrder.objects.create(
            business=task_po_env.business_b,
            branch=task_po_env.branch_b1,
            customer=task_po_env.customer_b,
            status=OrderStatus.PENDING,
            purchase_order=po
        )
        po.status = OrderStatus.SHIPPED
        po.save(update_fields=["status"])

        # Act
        synchronize_purchase_order_status_update_to_supplier_task(po.id)

        # Assert
        so.refresh_from_db()
        assert so.status == OrderStatus.SHIPPED

    def test_synchronize_purchase_order_items_update_to_supplier_task(self, task_po_env):
        # Arrange
        po = PurchaseOrder.objects.create(
            business=task_po_env.business_a,
            branch=task_po_env.branch_a1,
            supplier=task_po_env.supplier_a_to_b,
            status=OrderStatus.PENDING
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=task_po_env.product_a1,
            quantity=20,
            price=Decimal("15.00")
        )
        po.total_amount = Decimal("300.00")
        po.save()

        so = SalesOrder.objects.create(
            business=task_po_env.business_b,
            branch=task_po_env.branch_b1,
            customer=task_po_env.customer_b,
            status=OrderStatus.PENDING,
            purchase_order=po
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=task_po_env.product_b1,
            quantity=2,
            price=Decimal("10.00")
        )
        so.total_amount = Decimal("20.00")
        so.save()

        # Act
        synchronize_purchase_order_items_update_to_supplier_task(po.id)

        # Assert
        so.refresh_from_db()
        assert so.items.count() == 1
        assert so.total_amount == Decimal("300.00")

        synced_item = so.items.get()
        assert synced_item.product == task_po_env.product_b1
        assert synced_item.quantity == 20
        assert synced_item.price == Decimal("15.00")
