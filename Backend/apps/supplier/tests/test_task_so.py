import pytest
from decimal import Decimal
from unittest.mock import patch
from apps.base.tests import BaseTestCase
from apps.supplier.models import OrderStatus, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem
from apps.supplier.tasks.sales_order_tasks import (
    synchronize_purchase_order_status_update_to_customer_task,
    synchronize_sales_order_items_update_to_customer_task,
    synchronize_sales_order_to_customer_task,
)


@pytest.fixture
def task_so_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()

    def _create_sales_order(*, status=OrderStatus.PENDING, purchase_order=None):
        sales_order = SalesOrder.objects.create(
            business=tc.business_a,
            branch=tc.branch_a1,
            customer=tc.same_platform_customer,
            status=status,
            notes="SO for sync tests",
            purchase_order=purchase_order,
        )
        SalesOrderItem.objects.create(
            sales_order=sales_order,
            product=tc.product_a1,
            quantity=5,
            price=Decimal("8.00"),
        )
        sales_order.total_amount = Decimal("40.00")
        sales_order.save(update_fields=["total_amount"])
        return sales_order

    def _create_purchase_order(*, status=OrderStatus.PENDING):
        purchase_order = PurchaseOrder.objects.create(
            business=tc.business_b,
            branch=tc.branch_b1,
            supplier=tc.reciprocal_supplier,
            status=status,
            notes="PO for sync tests",
        )
        PurchaseOrderItem.objects.create(
            purchase_order=purchase_order,
            product=tc.mapped_product_b,
            quantity=2,
            price=Decimal("4.00"),
        )
        purchase_order.total_amount = Decimal("8.00")
        purchase_order.save(update_fields=["total_amount"])
        return purchase_order

    tc.create_so = _create_sales_order
    tc.create_po = _create_purchase_order
    return tc


@pytest.mark.django_db
class TestTaskSO:

    @patch("apps.supplier.tasks.purchase_order_tasks.synchronize_purchase_order_to_supplier_task.delay")
    def test_synchronize_sales_order_to_customer_task(self, mock_purchase_order_sync_delay, task_so_env):
        # Arrange
        sales_order = task_so_env.create_so(status=OrderStatus.CONFIRMED)

        # Act
        synchronize_sales_order_to_customer_task(sales_order.id)

        # Assert
        sales_order.refresh_from_db()
        assert sales_order.purchase_order is not None
        assert sales_order.purchase_order.business == task_so_env.business_b

        purchase_order = sales_order.purchase_order
        assert purchase_order.branch == task_so_env.branch_b1
        assert purchase_order.supplier == task_so_env.reciprocal_supplier
        assert purchase_order.status == OrderStatus.CONFIRMED
        assert f"SO #{sales_order.id}" in purchase_order.notes
        assert purchase_order.total_amount == Decimal("47.20")

        po_item = purchase_order.items.get()
        assert po_item.price == Decimal("8.00")

    def test_synchronize_purchase_order_status_update_to_customer_task(self, task_so_env):
        # Arrange
        purchase_order = task_so_env.create_po(status=OrderStatus.PENDING)
        sales_order = task_so_env.create_so(
            status=OrderStatus.SHIPPED,
            purchase_order=purchase_order,
        )

        # Act
        synchronize_purchase_order_status_update_to_customer_task(sales_order.id)

        # Assert
        purchase_order.refresh_from_db()
        assert purchase_order.status == OrderStatus.SHIPPED

    def test_synchronize_sales_order_items_update_to_customer_task(self, task_so_env):
        # Arrange
        purchase_order = task_so_env.create_po(status=OrderStatus.PENDING)
        PurchaseOrderItem.objects.create(
            purchase_order=purchase_order,
            product=task_so_env.product_b2,
            quantity=3,
            price=Decimal("15.00"),
        )
        purchase_order.total_amount = Decimal("53.00")
        purchase_order.save(update_fields=["total_amount"])

        sales_order = SalesOrder.objects.create(
            business=task_so_env.business_a,
            branch=task_so_env.branch_a1,
            customer=task_so_env.same_platform_customer,
            status=OrderStatus.PENDING,
            notes="SO items sync test",
            purchase_order=purchase_order,
        )
        SalesOrderItem.objects.create(
            sales_order=sales_order,
            product=task_so_env.product_a1,
            quantity=7,
            price=Decimal("12.00"),
        )
        sales_order.total_amount = Decimal("84.00")
        sales_order.save(update_fields=["total_amount"])

        # Act
        synchronize_sales_order_items_update_to_customer_task(sales_order.id)

        # Assert
        purchase_order.refresh_from_db()
        assert purchase_order.items.count() == 1
        assert purchase_order.total_amount == Decimal("84.00")

        synced_item = purchase_order.items.get()
        assert synced_item.product == task_so_env.mapped_product_b
        assert synced_item.quantity == 7
        assert synced_item.price == Decimal("12.00")
