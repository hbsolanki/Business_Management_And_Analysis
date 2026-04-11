from django.test import TransactionTestCase
from django.db import transaction
from rest_framework import status
from rest_framework.test import APIClient
from apps.supplier.models import PurchaseOrder, SalesOrder, Supplier, OrderStatus
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from apps.employee.models import UserBusinessRole, UserRole
from apps.base.tests.base_test import BaseTestCase
import logging

logger = logging.getLogger(__name__)

def execute_on_commit_callbacks():
    """ Helper to run on_commit hooks in TransactionTestCase """
    for callback in transaction.get_connection().run_on_commit:
        callback()
    transaction.get_connection().run_on_commit = []

class OrderPermissionTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Setup Business A (Buyer)
        self.business_a = Business.objects.create(name="Business A")
        self.branch_a = Branch.objects.create(name="Branch A", business=self.business_a)
        self.product_a = Product.objects.create(
            name="Product A", sku="SKU-A", business=self.business_a, 
            base_price=100, cost_price=50, input_gst_rate=18, output_gst_rate=18
        )
        self.product_b_in_a = Product.objects.create(
            name="Product B (copy)", sku="SKU-B", business=self.business_a, 
            base_price=200, cost_price=100, input_gst_rate=18, output_gst_rate=18
        )
        
        # 2. Setup Business B (Seller)
        self.business_b = Business.objects.create(name="Business B")
        self.branch_b1 = Branch.objects.create(name="Branch B1", business=self.business_b)
        self.branch_b2 = Branch.objects.create(name="Branch B2", business=self.business_b)
        self.product_b = Product.objects.create(
            name="Product B", sku="SKU-B", business=self.business_b, 
            base_price=200, cost_price=100, input_gst_rate=18, output_gst_rate=18
        )
        self.product_a_in_b = Product.objects.create(
            name="Product A (copy)", sku="SKU-A", business=self.business_b, 
            base_price=100, cost_price=50, input_gst_rate=18, output_gst_rate=18
        )

        # 3. Connect them: Business A is customer of Business B
        self.customer_of_b = BusinessCustomer.objects.create(
            business=self.business_b,
            customer_business=self.business_a,
            name="Business A (Customer)",
            integration_active=True,
            same_platform=True
        )
        
        # Business B is supplier of Business A
        self.supplier_of_a = Supplier.objects.create(
            business=self.business_a,
            supplier_business=self.business_b,
            name="Business B (Supplier)",
            integration_active=True,
            same_platform=True
        )

        # Standard User Setup for Auth
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user_a = User.objects.create_user(username="user_a", password="password")
        self.user_b = User.objects.create_user(username="user_b", password="password")
        
        UserBusinessRole.objects.create(user=self.user_a, business=self.business_a, role=UserRole.OWNER)
        UserBusinessRole.objects.create(user=self.user_b, business=self.business_b, role=UserRole.OWNER)
        
    def test_create_po_with_branch_from_different_business_fails(self):
        """ PO for Business A should not allow branch from Business B """
        self.client.force_authenticate(user=self.user_a)
        
        data = {
            "supplier": self.supplier_of_a.id,
            "branch": self.branch_b1.id,  # WRONG BRANCH (Business B)
            "items": [
                {"sku": "SKU-A", "quantity": 10, "unit_price": 50}
            ]
        }
        
        response = self.client.post("/supplier/purchase-order/", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Branch not found", str(response.data))

    def test_create_so_with_branch_from_different_business_fails(self):
        """ SO for Business B should not allow branch from Business A """
        self.client.force_authenticate(user=self.user_b)
        
        data = {
            "customer": self.customer_of_b.id,
            "branch": self.branch_a.id,  # WRONG BRANCH (Business A)
            "items": [
                {"sku": "SKU-B", "quantity": 5, "unit_price": 250}
            ]
        }
        
        response = self.client.post("/supplier/sales-order/", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Branch not found", str(response.data))

    def test_create_so_with_customer_from_different_business_fails(self):
        """ SO for Business B should not allow customer belonging to another vendor's context """
        # Create a dummy Business C
        business_c = Business.objects.create(name="Business C")
        customer_of_c = BusinessCustomer.objects.create(business=business_c, name="Fake Cust", mobile_number="0000000000")
        
        self.client.force_authenticate(user=self.user_b)
        data = {
            "customer": customer_of_c.id, # WRONG CUSTOMER (belongs to C)
            "branch": self.branch_b1.id,
            "items": [
                {"sku": "SKU-B", "quantity": 5, "unit_price": 250}
            ]
        }
        
        response = self.client.post("/supplier/sales-order/", data, format='json')
        # BusinessCustomer objects are scoped by business. 
        # SalesOrderSerializer.validate_customer (if exists) or PrimaryKeyRelatedField queryset
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_po_with_supplier_from_different_business_fails(self):
        """ PO for Business A should not allow supplier from another business context """
        business_c = Business.objects.create(name="Business C")
        supplier_of_c = Supplier.objects.create(business=business_c, name="Fake Supp")
        
        self.client.force_authenticate(user=self.user_a)
        data = {
            "supplier": supplier_of_c.id, # WRONG SUPPLIER (belongs to C)
            "branch": self.branch_a.id,
            "items": [
                {"sku": "SKU-A", "quantity": 10, "unit_price": 50}
            ]
        }
        
        response = self.client.post("/supplier/purchase-order/", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_po_with_product_from_different_business_fails(self):
        """ PO for Business A item should not allow product from Business B """
        self.client.force_authenticate(user=self.user_a)
        
        data = {
            "supplier": self.supplier_of_a.id,
            "branch": self.branch_a.id,
            "items": [
                {"sku": "SKU-B", "quantity": 10, "unit_price": 50} # WRONG PRODUCT (SKU-B belongs to B)
            ]
        }
        
        response = self.client.post("/supplier/purchase-order/", data, format='json')
        if response.status_code != status.HTTP_400_BAD_REQUEST:
            print(f"DEBUG: PO with foreign product response: {response.status_code}, {response.data}")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, f"Expected 400 for foreign product, got {response.status_code}: {response.data}")
        # PurchaseOrderItemSerializer.validate_product_id checks Product.objects.get(id=product_id, is_active=True)
        # But should it also check business? PurchaseOrderItemSerializer.validate doesn't check business yet.
        # Let's see if it fails due to get_business_context logic I added earlier.

    def test_reciprocal_sync_triggered_manual_po_creation(self):
        """ Creating a PO in A for Supplier B should trigger SO creation in B """
        self.client.force_authenticate(user=self.user_a)
        
        data = {
            "supplier": self.supplier_of_a.id,
            "branch": self.branch_a.id,
            "items": [
                {"sku": "SKU-A", "quantity": 10, "unit_price": 50}
            ]
        }
        
        response = self.client.post("/supplier/purchase-order/", data, format='json')
        if response.status_code != 201:
            print(f"DEBUG: Manual PO creation failed: {response.status_code}, {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Trigger on_commit tasks manually
        execute_on_commit_callbacks()
        
        # Verify SO exists in Business B
        so = SalesOrder.objects.filter(business=self.business_b).first()
        self.assertIsNotNone(so, "SalesOrder should be created in Business B via sync")
        self.assertEqual(so.total_amount, 10 * 50)
        self.assertEqual(so.purchase_order_id, response.data['id'])
