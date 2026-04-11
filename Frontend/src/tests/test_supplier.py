from apps.base.tests.base_test import BaseTestCase
from apps.supplier.models import Supplier
from apps.business.models import BusinessCustomer


class SupplierSetupTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.buyer_biz, _, _ = self.setup_business_with_plan(business_name="Buyer Biz")
        self.seller_biz, _, _ = self.setup_business_with_plan(business_name="Seller Biz")
        self.buyer_owner = self.create_owner(username="buyer_owner", business=self.buyer_biz)
        self.seller_owner = self.create_owner(username="seller_owner", business=self.seller_biz)

    def test_create_supplier_with_business_link(self):
        """Test creating a supplier and linking it to an existing business."""
        self.client.force_authenticate(user=self.buyer_owner)
        
        data = {
            "name": "Seller Business",
            "mobile_number": "1234567890",
            "supplier_business_id": self.seller_biz.id,
            "same_platform": True
        }
        
        url = "/supplier/vendor/"
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        
        supplier = Supplier.objects.get(id=response.data['id'])
        self.assertEqual(supplier.supplier_business, self.seller_biz)
        self.assertTrue(supplier.same_platform)

    def test_create_customer_with_business_link(self):
        """Test creating a business customer and linking it to their business profile."""
        self.client.force_authenticate(user=self.seller_owner)
        
        data = {
            "name": "Buyer Customer",
            "mobile_number": "9876543210",
            "customer_business_id": self.buyer_biz.id,
            "integration_active": True
        }
        
        url = "/business/customer/"
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        
        customer = BusinessCustomer.objects.get(id=response.data['id'])
        self.assertEqual(customer.customer_business, self.buyer_biz)
        self.assertTrue(customer.integration_active)

    def test_supplier_duplicate_prevention(self):
        """Test that duplicate suppliers (by mobile) are blocked per business."""
        Supplier.objects.create(
            business=self.buyer_biz,
            name="Existing",
            mobile_number="1112223333"
        )
        
        self.client.force_authenticate(user=self.buyer_owner)
        data = {
            "name": "New",
            "mobile_number": "1112223333"
        }
        response = self.client.post("/supplier/vendor/", data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("mobile_number", response.data)
