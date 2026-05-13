from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog
from apps.inventory.models import InventoryTransaction, InventoryTransactionItem


class InvoiceTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('invoice-list')
        
    def get_valid_payload(self, branch_id):
        return {
            "branch_id": branch_id,
            "payment_mode": "CASH",
            "customer": {
                "name": "New Customer",
                "mobile_number": "0987654321",
                "gender": "MALE",
                "age": 25,
                "email": "customer@example.com"
            },
            "invoice_items": [
                {
                    "product_id": self.product_a1.id,
                    "quantity": 2,
                    "base_price": "10.00",
                    "selling_price": "15.00"
                },
                {
                    "product_id": self.product_a2.id,
                    "quantity": 1,
                    "base_price": "20.00",
                    "selling_price": "25.00"
                }
            ]
        }



    # NEGATIVE TEST CASES
    def test_create_invoice_without_payment_mode(self):
        self.client.force_authenticate(user=self.owner_a)
        payload = self.get_valid_payload(self.branch_a1.id)
        payload.pop("payment_mode")
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment_mode", response.data)

    def test_create_invoice_without_invoice_items(self):
        self.client.force_authenticate(user=self.owner_a)
        payload = self.get_valid_payload(self.branch_a1.id)
        payload["invoice_items"] = []
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_invoice_with_invalid_product(self):
        self.client.force_authenticate(user=self.owner_a)
        payload = self.get_valid_payload(self.branch_a1.id)
        payload["invoice_items"][0]["product_id"] = 99999
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_invoice_insufficient_stock(self):
        self.client.force_authenticate(user=self.owner_a)
        payload = self.get_valid_payload(self.branch_a1.id)
        payload["invoice_items"][0]["quantity"] = 10000 
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data["invoice_items"][0])



    # OWNER
    def test_invoice_crud_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Create
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE)
        
        # 2. Read
        from apps.invoice.models import Invoice
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check counts (Paginated, so check results length against expected page size or total)
        total_count = Invoice.objects.filter(business=self.owner_a.business).count()
        expected_len = min(6, total_count) # PAGE_SIZE is 6
        self.assertEqual(len(response.data.get('results', response.data)), expected_len)
        
        # 3. Update
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a1.id])
        old_payment_mode = self.invoice_branch_a1.payment_mode
        update_data = {"payment_mode": "CASH", "branch_id": self.branch_a1.id}
        response = self.client.patch(detail_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.INVOICE)
        self.assertEqual(log.meta['payment_mode']['old'], old_payment_mode)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.INVOICE)

    # MANAGER
    def test_invoice_crud_by_manager_assigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)

        # 1. Create
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 2. Read
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check assigned
        from apps.invoice.models import Invoice
        expected_count = Invoice.objects.filter(branch=self.branch_a1).count()
        self.assertEqual(len(response.data.get('results', response.data)), expected_count)
        
        # 3. Update
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a1.id])
        response = self.client.patch(detail_url, {"payment_mode": "CASH", "branch_id": self.branch_a1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_invoice_crud_by_manager_unassigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)

        # 1. Create for unassigned
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a2.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) 

        # 2. Read
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a2.id])
        response = self.client.get(detail_url)
        # Check unassigned
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Update
        response = self.client.patch(detail_url, {"payment_mode": "CASH", "branch_id": self.branch_a2.id})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # EMPLOYEE NO PERMISSION
    def test_invoice_employee_assigned_branch_no_permission(self):
        self.client.force_authenticate(user=self.employee_a1)

        # Create
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Read
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Update
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a1.id])
        response = self.client.patch(detail_url, {"payment_mode": "CASH", "branch_id": self.branch_a1.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invoice_employee_unassigned_branch_no_permission(self):
        self.client.force_authenticate(user=self.employee_a1)

        # Create
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a2.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Read
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a2.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # EMPLOYEE WITH PERMISSION
    def test_invoice_employee_assigned_branch_with_permission(self):
        self.client.force_authenticate(user=self.employee_a1)
        self.assign_work_to_user(self.employee_a1, self.branch_a1, "INVOICE")

        # Create
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a1.id), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Read
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check assigned
        from apps.invoice.models import Invoice
        expected_count = Invoice.objects.filter(branch=self.branch_a1).count()
        self.assertEqual(len(response.data.get('results', response.data)), expected_count)

        # Update
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a1.id])
        response = self.client.patch(detail_url, {"payment_mode": "CASH", "branch_id": self.branch_a1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Delete -> Not strictly required since employee permission model applies standard RBAC
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_invoice_employee_unassigned_branch_with_permission(self):
        self.client.force_authenticate(user=self.employee_a1)
        self.assign_work_to_user(self.employee_a1, self.branch_a1, "INVOICE")

        # Create
        response = self.client.post(self.list_url, self.get_valid_payload(self.branch_a2.id), format='json')
        # Even with global perm, must fail branch isolation validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Read
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a2.id])
        response = self.client.get(detail_url)
        # Check filtered
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Update
        response = self.client.patch(detail_url, {"payment_mode": "CASH", "branch_id": self.branch_a2.id})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # CROSS BUSINESS
    def test_invoice_crud_by_owner_other_business(self):
        self.client.force_authenticate(user=self.owner_b)
        
        detail_url = reverse('invoice-detail', args=[self.invoice_branch_a1.id])
        
        # Read
        response = self.client.get(detail_url)
        # Check isolated
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Update
        response = self.client.patch(detail_url, {"payment_mode": "CASH", "branch_id": self.branch_a1.id})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # Filter combination tests

    def test_invoice_filtering_combinations(self):
        from datetime import timedelta
        from django.utils import timezone
        from apps.invoice.models import Invoice
        self.client.force_authenticate(user=self.owner_a)

        # Seed dates
        Invoice.objects.filter(id=self.invoice_branch_a1.id).update(
            created_at=timezone.now()
        )
        Invoice.objects.filter(id=self.invoice_branch_a1_2.id).update(
            created_at=timezone.now() - timedelta(days=1)
        )
        Invoice.objects.filter(id=self.invoice_branch_a2.id).update(
            created_at=timezone.now() - timedelta(days=2)
        )
        from_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        to_date = (timezone.now().date() - timedelta(days=1)).isoformat()

        # 1. Branch A1 filter
        response = self.client.get(f"{self.list_url}?branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, 200)
        from apps.invoice.models import Invoice
        expected_count = Invoice.objects.filter(branch=self.branch_a1).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)

        # 2. Branch A2 filter
        response = self.client.get(f"{self.list_url}?branch={self.branch_a2.id}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(branch=self.branch_a2).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["branch"], self.branch_a2.id)

        # 3. Mobile number exact
        response = self.client.get(f"{self.list_url}?mobile_number={self.customer_a.mobile_number}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(business=self.business_a, customer__mobile_number=self.customer_a.mobile_number).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["customer"]["mobile_number"], self.customer_a.mobile_number)

        # 4. From date filter
        response = self.client.get(f"{self.list_url}?from_date={from_date}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(business=self.business_a, created_at__date__gte=from_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)

        # 5. To date filter
        response = self.client.get(f"{self.list_url}?to_date={to_date}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(business=self.business_a, created_at__date__lte=to_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertLessEqual(response.data["results"][0]["created_at"][:10], to_date)

        # 6. Branch + from date
        response = self.client.get(f"{self.list_url}?branch={self.branch_a1.id}&from_date={from_date}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(branch=self.branch_a1, created_at__date__gte=from_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        if expected_count > 0:
            self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)
            self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)

        # 7. Branch + to date
        response = self.client.get(f"{self.list_url}?branch={self.branch_a1.id}&to_date={to_date}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(branch=self.branch_a1, created_at__date__lte=to_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        if expected_count > 0:
            self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)
            self.assertLessEqual(response.data["results"][0]["created_at"][:10], to_date)

        # 8. From date + to date range
        response = self.client.get(f"{self.list_url}?from_date={from_date}&to_date={to_date}")
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(business=self.business_a, created_at__date__gte=from_date, created_at__date__lte=to_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        if expected_count > 0:
            self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)
            self.assertLessEqual(response.data["results"][0]["created_at"][:10], to_date)

        # 9. Mobile + from date
        response = self.client.get(
            f"{self.list_url}?mobile_number={self.customer_a.mobile_number}&from_date={from_date}"
        )
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(business=self.business_a, customer__mobile_number=self.customer_a.mobile_number, created_at__date__gte=from_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        if expected_count > 0:
            self.assertEqual(response.data["results"][0]["customer"]["mobile_number"], self.customer_a.mobile_number)
            self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)

        # 10. Branch + mobile + date range
        response = self.client.get(
            f"{self.list_url}?branch={self.branch_a1.id}&mobile_number={self.customer_a.mobile_number}&from_date={from_date}"
        )
        self.assertEqual(response.status_code, 200)
        expected_count = Invoice.objects.filter(branch=self.branch_a1, customer__mobile_number=self.customer_a.mobile_number, created_at__date__gte=from_date).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        if expected_count > 0:
            self.assertEqual(response.data["results"][0]["branch"], self.branch_a1.id)
            self.assertEqual(response.data["results"][0]["customer"]["mobile_number"], self.customer_a.mobile_number)
            self.assertGreaterEqual(response.data["results"][0]["created_at"][:10], from_date)

    # Pagination test

    def test_invoice_pagination(self):
        from apps.invoice.models import Invoice, ProductInvoice
        self.client.force_authenticate(user=self.owner_a)

        # Seed 3 more (5 existing + 3 = 8)
        for i in range(3):
            inv = Invoice.objects.create(
                business=self.business_a,
                branch=self.branch_a1,
                customer=self.customer_a,
                payment_mode="CASH",
                total_amount=50.00,
                sub_total=50.00
            )
            ProductInvoice.objects.create(
                invoice=inv,
                product=self.product_a1,
                quantity=1,
                selling_price=50.00,
                base_price=45.00
            )

        # Page 1
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])

        # Page 2 (remaining 5)
        response = self.client.get(response.data["next"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertIsNone(response.data["next"])

    def test_inventory_transaction_created_on_invoice_creation(self):
        """Verify InventoryTransaction (OUT) is created when an Invoice is created."""
        self.client.force_authenticate(user=self.owner_a)
        payload = self.get_valid_payload(self.branch_a1.id)
        
        # Before count
        initial_tx_count = InventoryTransaction.objects.count()
        
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice_id = response.data["id"]
        
        # After count
        self.assertEqual(InventoryTransaction.objects.count(), initial_tx_count + 1)
        
        # Verify transaction details
        tx = InventoryTransaction.objects.latest('created_at')
        self.assertEqual(tx.action, "OUT")
        self.assertEqual(tx.inventory.branch.id, self.branch_a1.id)
        self.assertIn(f"Invoice #{invoice_id}", tx.description)
        
        # Verify transaction items
        self.assertEqual(tx.items.count(), 2)
        tx_items = {item.product.id: item.quantity for item in tx.items.all()}
        
        for item in payload["invoice_items"]:
            self.assertEqual(tx_items[item["product_id"]], item["quantity"])

    def test_invoice_gst_calculation(self):
        """Verify that total_amount correctly includes GST based on product output_gst_rate."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Calculate expected values dynamically based on product objects
        # Ensure Decimal type for all arithmetic to avoid TypeErrors with floats
        base_price_a1 = Decimal(str(self.product_a1.base_price))
        gst_rate_a1 = Decimal(str(self.product_a1.output_gst_rate))
        gst_amount_a1 = base_price_a1 * gst_rate_a1 / Decimal("100")
        expected_selling_price_a1 = base_price_a1 + gst_amount_a1
        
        base_price_a2 = Decimal(str(self.product_a2.base_price))
        gst_rate_a2 = Decimal(str(self.product_a2.output_gst_rate))
        gst_amount_a2 = base_price_a2 * gst_rate_a2 / Decimal("100")
        expected_selling_price_a2 = base_price_a2 + gst_amount_a2
        
        qty_a1 = Decimal("2")
        qty_a2 = Decimal("1")
        
        expected_sub_total = (base_price_a1 * qty_a1) + (base_price_a2 * qty_a2)
        expected_total_amount = (expected_selling_price_a1 * qty_a1) + (expected_selling_price_a2 * qty_a2)
        
        payload = {
            "branch_id": self.branch_a1.id,
            "payment_mode": "CASH",
            "customer": {
                "name": "GST Test Customer",
                "mobile_number": "1122334455"
            },
            "invoice_items": [
                {
                    "product_id": self.product_a1.id,
                    "quantity": qty_a1
                },
                {
                    "product_id": self.product_a2.id,
                    "quantity": qty_a2
                }
            ]
        }
        
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.assertEqual(Decimal(str(response.data["sub_total"])), expected_sub_total.quantize(Decimal("0.00")))
        self.assertEqual(Decimal(str(response.data["total_amount"])), expected_total_amount.quantize(Decimal("0.00")))
        
        # Verify New Structural GST Fields
        expected_total_tax = expected_total_amount - expected_sub_total
        expected_cgst = expected_total_tax / Decimal("2")
        expected_sgst = expected_total_tax / Decimal("2")
        
        from apps.invoice.models import Invoice
        invoice = Invoice.objects.get(id=response.data["id"])
        
        self.assertEqual(invoice.total_tax, expected_total_tax.quantize(Decimal("0.00")))
        self.assertEqual(invoice.cgst_total, expected_cgst.quantize(Decimal("0.00")))
        self.assertEqual(invoice.sgst_total, expected_sgst.quantize(Decimal("0.00")))
        self.assertEqual(invoice.igst_total, Decimal("0.00"))

        # Verify ProductInvoice entries
        from apps.invoice.models import ProductInvoice
        invoice_id = response.data["id"]
        items = ProductInvoice.objects.filter(invoice_id=invoice_id)
        
        item1 = items.get(product=self.product_a1)
        self.assertEqual(item1.base_price, self.product_a1.base_price)
        self.assertEqual(item1.selling_price, expected_selling_price_a1.quantize(Decimal("0.00")))
        
        item2 = items.get(product=self.product_a2)
        self.assertEqual(item2.base_price, self.product_a2.base_price)
        self.assertEqual(item2.selling_price, expected_selling_price_a2.quantize(Decimal("0.00")))

    def test_gst_summary_auto_aggregation(self):
        """Verify that MonthlyGSTSummary is automatically updated when an invoice is created."""
        from apps.gst_management.models import MonthlyGSTSummary
        from apps.invoice.models import Invoice
        from django.utils import timezone
        
        self.client.force_authenticate(user=self.owner_a)
        
        month = timezone.now().month
        year = timezone.now().year
        
        from django.db.models import Sum
        from apps.supplier.models import SalesOrder
        aggregates = Invoice.objects.filter(
            business=self.owner_a.business,
            created_at__month=month,
            created_at__year=year,
            is_deleted=False
        ).aggregate(total_sales=Sum('total_amount'))
        
        so_aggregates = SalesOrder.objects.filter(
            business=self.owner_a.business,
            created_at__month=month,
            created_at__year=year,
            is_deleted=False,
            invoices__isnull=True
        ).aggregate(total_sales=Sum('total_amount'))
        
        initial_sales = (aggregates['total_sales'] or Decimal("0.00")) + (so_aggregates['total_sales'] or Decimal("0.00"))
        
        # Create an invoice
        payload = self.get_valid_payload(self.branch_a1.id)
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check aggregation
        summary = MonthlyGSTSummary.objects.get(business=self.owner_a.business, month=month, year=year)
        expected_sales = initial_sales + Decimal(str(response.data["total_amount"]))
        self.assertEqual(summary.total_sales, expected_sales)
        
        # Create another invoice and check if it aggregates further
        response2 = self.client.post(self.list_url, payload, format='json')
        summary.refresh_from_db()
        
        expected_total = expected_sales + Decimal(str(response2.data["total_amount"]))
        self.assertEqual(summary.total_sales, expected_total)

