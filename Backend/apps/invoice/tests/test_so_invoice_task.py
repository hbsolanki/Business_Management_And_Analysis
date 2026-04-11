from django.test import TestCase
from apps.base.tests import BaseTestCase
from apps.supplier.models import SalesOrder, SalesOrderItem
from apps.invoice.models import Invoice
from apps.inventory.models import InventoryTransaction
from apps.supplier.tasks.sales_order_invoice_tasks import create_invoice_from_sales_order_task
from apps.inventory.models import InventoryProduct

class SalesOrderToInvoiceTaskTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_create_invoice_from_sales_order_success(self):
        """Verify successful creation of invoice from sales order."""
        so = self.so_a1
        so.created_by = self.owner_a
        so.save()
        initial_invoice_count = Invoice.objects.count()
        initial_tx_count = InventoryTransaction.objects.count()
        initial_stock = self.inventory_product_a1_1.stock_quantity

        # Run task
        result = create_invoice_from_sales_order_task(so.id)
        
        # Verify result
        self.assertIn("Invoice #", result)
        self.assertEqual(Invoice.objects.count(), initial_invoice_count + 1)
        
        # Verify Invoice details
        invoice = Invoice.objects.latest('created_at')
        self.assertEqual(invoice.business, so.business)
        self.assertEqual(invoice.branch, so.branch)
        self.assertEqual(invoice.customer, so.customer)
        
        # Verify Inventory Transaction
        self.assertEqual(InventoryTransaction.objects.count(), initial_tx_count + 1)
        tx = InventoryTransaction.objects.latest('created_at')
        self.assertEqual(tx.action, "OUT")
        self.assertIn(f"Invoice #{invoice.id}", tx.description)
        
        # Verify Stock Reduction
        self.inventory_product_a1_1.refresh_from_db()
        # SO A1 has 5 items of Product A1
        self.assertEqual(self.inventory_product_a1_1.stock_quantity, initial_stock - 5)

    def test_create_invoice_from_sales_order_not_found(self):
        """Verify task handles missing sales order gracefully."""
        result = create_invoice_from_sales_order_task(99999)
        self.assertIsNone(result)

    def test_create_invoice_from_sales_order_insufficient_stock(self):
        """Verify task fails when there is insufficient stock for the sales order."""
        # Create a new SO with high quantity
        so = SalesOrder.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            customer=self.customer_a,
            created_by=self.owner_a,
            notes="Insufficient Stock SO"
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product_a1,
            quantity=1000,  # exceeds 100 stock
            unit_price=10.0
        )
        
        initial_invoice_count = Invoice.objects.count()
        
        # Run task
        result = create_invoice_from_sales_order_task(so.id)
        
        # Verify validation error
        self.assertIn("Validation Error", result)
        self.assertEqual(Invoice.objects.count(), initial_invoice_count)
