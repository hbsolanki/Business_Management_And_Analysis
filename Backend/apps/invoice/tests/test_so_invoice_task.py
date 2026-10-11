import pytest
from apps.base.tests import BaseTestCase
from apps.supplier.models import SalesOrder, SalesOrderItem
from apps.invoice.models import Invoice
from apps.inventory.models import InventoryTransaction
from apps.supplier.tasks.sales_order_invoice_tasks import create_invoice_from_sales_order_task


@pytest.fixture
def so_invoice_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestSalesOrderToInvoiceTaskPytest:

    def test_create_invoice_from_sales_order_success(self, so_invoice_env):
        """Verify successful creation of invoice from sales order."""
        # Arrange
        sut_so = so_invoice_env.so_a1
        sut_so.created_by = so_invoice_env.owner_a
        sut_so.save()
        initial_invoice_count = Invoice.objects.count()
        initial_tx_count = InventoryTransaction.objects.count()
        initial_stock = so_invoice_env.inventory_product_a1_1.stock_quantity

        # Act
        sut_result = create_invoice_from_sales_order_task(sut_so.id)

        # Assert
        assert "Invoice #" in sut_result
        assert Invoice.objects.count() == initial_invoice_count + 1

        # Verify Invoice details
        sut_invoice = Invoice.objects.latest('created_at')
        assert sut_invoice.business == sut_so.business
        assert sut_invoice.branch == sut_so.branch
        assert sut_invoice.customer == sut_so.customer

        # Verify Inventory Transaction
        assert InventoryTransaction.objects.count() == initial_tx_count + 1
        sut_tx = InventoryTransaction.objects.latest('created_at')
        assert sut_tx.action == "OUT"
        assert f"Invoice #{sut_invoice.id}" in sut_tx.description

        # Verify Stock Reduction
        so_invoice_env.inventory_product_a1_1.refresh_from_db()
        assert so_invoice_env.inventory_product_a1_1.stock_quantity == initial_stock - 5

    def test_create_invoice_from_sales_order_not_found(self, so_invoice_env):
        """Verify task handles missing sales order gracefully."""
        # Arrange
        sut_invalid_so_id = 99999

        # Act
        sut_result = create_invoice_from_sales_order_task(sut_invalid_so_id)

        # Assert
        assert sut_result is None

    def test_create_invoice_from_sales_order_insufficient_stock(self, so_invoice_env):
        """Verify task fails when there is insufficient stock for the sales order."""
        # Arrange
        sut_so = SalesOrder.objects.create(
            business=so_invoice_env.business_a,
            branch=so_invoice_env.branch_a1,
            customer=so_invoice_env.customer_a,
            created_by=so_invoice_env.owner_a,
            notes="Insufficient Stock SO"
        )
        SalesOrderItem.objects.create(
            sales_order=sut_so,
            product=so_invoice_env.product_a1,
            quantity=1000,
            price=10.0
        )
        initial_invoice_count = Invoice.objects.count()

        # Act
        sut_result = create_invoice_from_sales_order_task(sut_so.id)

        # Assert
        assert "Validation Error" in sut_result
        assert Invoice.objects.count() == initial_invoice_count
