from unittest.mock import patch, MagicMock
from django.test import TestCase
from apps.supplier.models import Supplier, PurchaseOrder, SalesOrder, PurchaseOrderItem, SalesOrderItem
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from apps.supplier.utils.integration_service import (
    push_purchase_order_to_supplier_external_api,
    push_sales_order_to_customer_external_api,
    push_purchase_order_status_to_supplier_external_api,
    push_sales_order_status_to_customer_external_api
)
import requests
from decimal import Decimal

class IntegrationServiceTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name="Source Biz", gst_number="GST123")
        self.branch = Branch.objects.create(business=self.business, name="Main")
        
        self.product = Product.objects.create(
            business=self.business,
            name="Test Product",
            sku="SKU-EXT-1",
            base_price=Decimal("100.00"),
            cost_price=Decimal("80.00"),
            input_gst_rate=18,
            output_gst_rate=18
        )

        self.supplier = Supplier.objects.create(
            business=self.business,
            name="Ext Supplier",
            mobile_number="1234567890",
            api_url="https://api.supplier.com/orders/",
            api_key="supp-key",
            integration_active=True
        )

        self.customer = BusinessCustomer.objects.create(
            business=self.business,
            name="Ext Customer",
            mobile_number="0987654321",
            api_url="https://api.customer.com/orders/",
            api_key="cust-key",
            integration_active=True
        )

    @patch('requests.post')
    def test_push_purchase_order_to_supplier_success(self, mock_post):
        po = PurchaseOrder.objects.create(
            business=self.business,
            branch=self.branch,
            supplier=self.supplier,
            notes="Testing push"
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=self.product,
            quantity=5,
            unit_cost=Decimal("80.00")
        )

        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        result = push_purchase_order_to_supplier_external_api(po)
        
        self.assertTrue(result)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], self.supplier.api_url)
        self.assertEqual(kwargs['headers']['X-BMA-API-Key'], self.supplier.api_key)
        self.assertEqual(kwargs['json']['items'][0]['sku'], "SKU-EXT-1")
        self.assertEqual(kwargs['json']['items'][0]['quantity'], 5)

    @patch('requests.post')
    def test_push_sales_order_to_customer_success(self, mock_post):
        so = SalesOrder.objects.create(
            business=self.business,
            branch=self.branch,
            customer=self.customer,
            notes="Testing push SO"
        )
        SalesOrderItem.objects.create(
            sales_order=so,
            product=self.product,
            quantity=10,
            unit_price=Decimal("120.00")
        )

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        result = push_sales_order_to_customer_external_api(so)
        
        self.assertTrue(result)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], self.customer.api_url)
        # For customer sync, unit_price of SO becomes unit_cost for customer's PO
        self.assertEqual(kwargs['json']['items'][0]['unit_cost'], 120.0)

    @patch('requests.post')
    def test_push_purchase_order_failure_raises_error(self, mock_post):
        po = PurchaseOrder.objects.create(business=self.business, branch=self.branch, supplier=self.supplier)
        
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Error detail"
        mock_post.return_value = mock_response

        with self.assertRaises(RuntimeError) as cm:
            push_purchase_order_to_supplier_external_api(po)
        self.assertIn("Supplier API failed: 400", str(cm.exception))

    def test_push_status_skips_without_tracking(self):
        po = PurchaseOrder.objects.create(business=self.business, branch=self.branch, supplier=self.supplier)
        so = SalesOrder.objects.create(business=self.business, branch=self.branch, customer=self.customer)
        
        # Currently, buttons for status sync to external are skipped or returning False
        # because the remote ID tracking was requested to be removed.
        self.assertFalse(push_purchase_order_status_to_supplier_external_api(po, "DELIVERED"))
        self.assertFalse(push_sales_order_status_to_customer_external_api(so, "SHIPPED"))
