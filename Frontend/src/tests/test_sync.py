from django.test import override_settings
from unittest.mock import patch, MagicMock
from rest_framework import status
from apps.base.tests.base_test import BaseTestCase
from apps.supplier.models import Supplier, PurchaseOrder, SalesOrder, OrderStatus, PurchaseOrderItem, SalesOrderItem
from apps.business.models import Branch, BusinessCustomer
from apps.product.models import Product
from apps.inventory.models import Inventory, InventoryProduct
from decimal import Decimal
import requests

@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class SyncTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        
        # Setup Businesses
        self.buyer_biz, _, _ = self.setup_business_with_plan(business_name="Buyer Ltd")
        self.seller_biz, _, _ = self.setup_business_with_plan(business_name="Seller Corp")
        
        # Setup Owners
        self.buyer_owner = self.create_owner(username="buyer_owner", business=self.buyer_biz)
        self.seller_owner = self.create_owner(username="seller_owner", business=self.seller_biz)
        
        # Setup Branches
        self.buyer_branch = Branch.objects.create(business=self.buyer_biz, name="Buyer Main")
        self.seller_branch = Branch.objects.create(business=self.seller_biz, name="Seller Main")
        
        # Products with Matching SKU
        self.sku = "SYNC-SKU-GLOB"
        self.buyer_product = Product.objects.create(
            business=self.buyer_biz, name="Gadget", sku=self.sku,
            base_price=100, cost_price=80, input_gst_rate=18, output_gst_rate=18
        )
        self.seller_product = Product.objects.create(
            business=self.seller_biz, name="Gadget", sku=self.sku,
            base_price=120, cost_price=70, input_gst_rate=18, output_gst_rate=18
        )

        # Platform Link
        self.supplier = Supplier.objects.create(
            business=self.buyer_biz, supplier_business=self.seller_biz,
            name="Seller Corp", mobile_number="9988776655",
            same_platform=True, integration_active=True
        )
        self.customer = BusinessCustomer.objects.create(
            business=self.seller_biz, customer_business=self.buyer_biz,
            name="Buyer Ltd", mobile_number="1122334455",
            integration_active=True, same_platform=True
        )

    def test_po_creation_syncs_to_so(self):
        """Test that creating a PO in Buyer business creates an SO in Seller business."""
        self.client.force_authenticate(user=self.buyer_owner)
        data = {
            "supplier": self.supplier.id,
            "branch_id": self.buyer_branch.id,
            "items": [{"product_id": self.buyer_product.id, "quantity": 5, "unit_cost": 85}]
        }
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post("/supplier/purchase-order/", data, format='json')
        
        self.assertEqual(response.status_code, 201)
        po = PurchaseOrder.objects.get(id=response.data['id'])
        so = SalesOrder.objects.get(purchase_order=po)
        self.assertEqual(so.business, self.seller_biz)
        self.assertEqual(so.items.first().product, self.seller_product)

    def test_so_creation_syncs_to_po(self):
        """Test that creating an SO in Seller business creates a PO in Buyer business."""
        self.client.force_authenticate(user=self.seller_owner)
        data = {
            "customer": self.customer.id,
            "branch": self.seller_branch.id,
            "items": [{"sku": self.sku, "quantity": 10, "unit_price": 95}]
        }
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post("/supplier/sales-order/", data, format='json')
        
        self.assertEqual(response.status_code, 201)
        so = SalesOrder.objects.get(id=response.data['id'])
        po = PurchaseOrder.objects.get(sales_orders=so)
        self.assertEqual(po.business, self.buyer_biz)
        self.assertEqual(po.items.first().product, self.buyer_product)

    def test_status_sync_bidirectional(self):
        """Test that status updates sync between linked orders."""
        # Setup linked orders
        self.test_po_creation_syncs_to_so()
        po = PurchaseOrder.objects.first()
        so = SalesOrder.objects.get(purchase_order=po)

        # 1. PO Update -> SO
        self.client.force_authenticate(user=self.buyer_owner)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.patch(f"/supplier/purchase-order/{po.id}/", {"status": OrderStatus.CONFIRMED})
        so.refresh_from_db()
        self.assertEqual(so.status, OrderStatus.CONFIRMED)

        # 2. SO Update -> PO
        self.client.force_authenticate(user=self.seller_owner)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.patch(f"/supplier/sales-order/{so.id}/", {"status": OrderStatus.SHIPPED})
        po.refresh_from_db()
        self.assertEqual(po.status, OrderStatus.SHIPPED)

    def test_item_sync_bidirectional(self):
        """Test that item updates (quantity/price) and deletions sync between orders."""
        # 1. Setup linked orders
        self.test_po_creation_syncs_to_so()
        po = PurchaseOrder.objects.first()
        so = SalesOrder.objects.get(purchase_order=po)
        
        # 2. Update PO Items -> SO
        self.client.force_authenticate(user=self.buyer_owner)
        data = {
            "items": [
                {
                    "product_id": self.buyer_product.id,
                    "quantity": 20,
                    "unit_cost": 75
                }
            ]
        }
        with self.captureOnCommitCallbacks(execute=True):
            self.client.patch(f"/supplier/purchase-order/{po.id}/", data, format='json')
        
        so.refresh_from_db()
        so_item = so.items.first()
        self.assertEqual(so_item.quantity, 20)
        self.assertEqual(so_item.unit_price, 75)
        self.assertEqual(so.total_amount, 20 * 75)

        # 3. Update SO Items -> PO
        self.client.force_authenticate(user=self.seller_owner)
        data = {
            "items": [
                {
                    "sku": self.sku,
                    "quantity": 15,
                    "unit_price": 90
                }
            ]
        }
        with self.captureOnCommitCallbacks(execute=True):
            self.client.patch(f"/supplier/sales-order/{so.id}/", data, format='json')
        
        po.refresh_from_db()
        po_item = po.items.first()
        self.assertEqual(po_item.quantity, 15)
        self.assertEqual(po_item.unit_cost, 90)
        self.assertEqual(po.total_amount, 15 * 90)

    @patch('requests.post')
    def test_external_po_sync_flow(self, mock_post):
        """Test external API sync flow for non-platform suppliers."""
        ext_supplier = Supplier.objects.create(
            business=self.buyer_biz, name="Ext Vendor", mobile_number="000111",
            api_url="http://ext.com", api_key="key", integration_active=True
        )
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        self.client.force_authenticate(user=self.buyer_owner)
        data = {
            "branch_id": self.buyer_branch.id,
            "supplier": ext_supplier.id,
            "items": [{"product_id": self.buyer_product.id, "quantity": 1, "unit_cost": 10}]
        }
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post("/supplier/purchase-order/", data, format='json')
        
        mock_post.assert_called_once()
