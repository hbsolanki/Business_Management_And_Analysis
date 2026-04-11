from django.test import TransactionTestCase, TestCase
from rest_framework.test import APIClient
from apps.supplier.models import Supplier, PurchaseOrder, SalesOrder, OrderStatus
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from decimal import Decimal
import logging
from django.db import transaction

logger = logging.getLogger(__name__)

def execute_on_commit_callbacks():
    """ Helper to run on_commit hooks in TransactionTestCase """
    while transaction.get_connection().run_on_commit:
        s_at_commit = transaction.get_connection().run_on_commit
        transaction.get_connection().run_on_commit = []
        for func in s_at_commit:
            func()

class APIKeySyncTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Setup Buyer Business (The one receiving the PO)
        self.buyer_biz = Business.objects.create(name="Buyer Biz", gst_number="GST-BUYER")
        self.buyer_branch = Branch.objects.create(business=self.buyer_biz, name="Buyer Branch")
        
        # 2. Setup Seller Business (The one acting as Supplier)
        self.seller_biz = Business.objects.create(name="Seller Biz", gst_number="GST-SELLER")
        self.seller_branch = Branch.objects.create(business=self.seller_biz, name="Seller Branch")

        # 3. Setup Products (Matching by SKU)
        self.sku = "SKU-SYNC-100"
        self.buyer_product = Product.objects.create(
            business=self.buyer_biz, name="Prod at Buyer", sku=self.sku,
            base_price=100, cost_price=80, input_gst_rate=18, output_gst_rate=18
        )
        self.seller_product = Product.objects.create(
            business=self.seller_biz, name="Prod at Seller", sku=self.sku,
            base_price=80, cost_price=60, input_gst_rate=18, output_gst_rate=18
        )

        # 4. Setup Supplier at Buyer (Points to Seller)
        self.api_key = "secret-seller-key"
        self.supplier_at_buyer = Supplier.objects.create(
            business=self.buyer_biz,
            supplier_business=self.seller_biz,
            name="Seller as Supplier",
            mobile_number="1111111111",
            api_key=self.api_key,
            integration_active=True,
            same_platform=True
        )

        # 5. Setup Customer at Seller (Points to Buyer)
        self.customer_at_seller = BusinessCustomer.objects.create(
            business=self.seller_biz,
            customer_business=self.buyer_biz,
            name="Buyer as Customer",
            mobile_number="2222222222",
            same_platform=True
        )

    def test_incoming_po_creation_via_api_key_syncs_to_so(self):
        """
        Scenario: Seller pushes a PO to Buyer's API using Seller's API key.
        The Buyer system should:
        1. Authenticate via API key (resolving to supplier_at_buyer).
        2. Create a PO in Buyer's business.
        3. Since same_platform=True, trigger a sync to create a SalesOrder back in Seller's business.
        """
        # Payload as if Seller is sending their PO data
        data = {
            "supplier": self.supplier_at_buyer.id,
            "branch": self.buyer_branch.id,
            "items": [
                {
                    "sku": self.sku,
                    "quantity": 10,
                    "unit_cost": 75.0
                }
            ],
            "notes": "Sync from external seller"
        }

        # Use the header defined in SupplierKeyAuthentication: HTTP_X_SUPPLIER_API_KEY
        self.client.credentials(HTTP_X_SUPPLIER_API_KEY=self.api_key)
        
        # Seller calls Buyer's PurchaseOrder endpoint
        # In a real sync, Seller's PO sync task would call this
        response = self.client.post("/supplier/purchase-order/", data, format='json')
        execute_on_commit_callbacks()
        
        self.assertEqual(response.status_code, 201)
        
        # Verify PO created at Buyer
        po = PurchaseOrder.objects.get(id=response.data['id'])
        self.assertEqual(po.business, self.buyer_biz)
        self.assertEqual(po.supplier, self.supplier_at_buyer)
        
        # Verify reciprocal SO created at Seller (via same_platform sync)
        so = SalesOrder.objects.filter(business=self.seller_biz, purchase_order=po).first()
        self.assertIsNotNone(so, "SalesOrder should be automatically created in Seller's business")
        self.assertEqual(so.customer, self.customer_at_seller)
        self.assertEqual(so.total_amount, Decimal("750.00")) # 10 * 75
        self.assertEqual(so.items.first().product, self.seller_product)

    def test_invalid_api_key_fails(self):
        self.client.credentials(HTTP_X_SUPPLIER_API_KEY="wrong-key")
        response = self.client.post("/supplier/purchase-order/", {}, format='json')
        self.assertEqual(response.status_code, 403) # AuthenticationFailed maps to 403 or 401 depending on other classes
