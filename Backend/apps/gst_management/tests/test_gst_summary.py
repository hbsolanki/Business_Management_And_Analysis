from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from django.utils import timezone
from datetime import datetime
from apps.base.tests import BaseTestCase
from apps.gst_management.models import MonthlyGSTSummary
from apps.invoice.models import Invoice
from apps.supplier.models import OrderStatus
from apps.cost.models import Expense
from apps.base.models import GST

class GSTManagementTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.summary_list_url = reverse('gst-summary-list')
        self.invoice_ledger_url = reverse('gst-summary-invoices')
        self.po_ledger_url = reverse('gst-summary-purchase-orders')
        self.expense_ledger_url = reverse('gst-summary-expenses')
        
        # Create some Expenses with GST for testing
        self.expense_gst = GST.objects.create(
            gst_rate=Decimal("18.0"),
            gst_amount=Decimal("18.0"),
            total_amount=Decimal("118.0")
        )
        self.expense_a = Expense.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            category=self.cost_category_a,
            title="Office Rent",
            amount=Decimal("100.0"),
            date=timezone.now().date(),
            gst=self.expense_gst
        )

    def test_summary_list_and_filtering(self):
        """Test retrieving and filtering monthly GST summaries."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Trigger an aggregation to ensure summary exists for current month
        from apps.gst_management.tasks import update_gst_summary_task
        now = timezone.now()
        # Aggregation
        update_gst_summary_task(self.business_a.id, now.month, now.year)
        
        response = self.client.get(self.summary_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Safety check/re-run
        results = response.data
        if len(results) == 0:
            update_gst_summary_task(self.business_a.id, now.month, now.year)
            response = self.client.get(self.summary_list_url)
            results = response.data
            
        self.assertGreaterEqual(len(results), 1, f"Summary not found for business {self.business_a.id}")
        
        # Filter by month/year
        response = self.client.get(f"{self.summary_list_url}?month={now.month}&year={now.year}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['month'], now.month)
        self.assertEqual(results[0]['year'], now.year)

    def test_ledger_filtering_combinations(self):
        """Test various filtering combinations for ledgers."""
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Invoice Ledger Filters
        response = self.client.get(f"{self.invoice_ledger_url}?branch={self.branch_a1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data:
            self.assertEqual(item['branch'], self.branch_a1.id)
            
        # 2. Purchase Order Ledger Filters
        self.po_a1.status = OrderStatus.DELIVERED
        self.po_a1.received_at = timezone.now()
        self.po_a1.save()
        
        supplier_name = self.supplier_a1.name
        response = self.client.get(f"{self.po_ledger_url}?supplier_name={supplier_name}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data:
            self.assertEqual(item['party_name'], supplier_name)

    def test_cross_business_isolation(self):
        """Ensure Business A cannot see Business B's data."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Try to filter by Business B's branch in A's ledger
        response = self.client.get(f"{self.invoice_ledger_url}?branch={self.branch_b1.id}")
        # View filtering should restrict results to 0 because branch_b1 is not in business_a's invoices
        self.assertEqual(len(response.data), 0)

    def test_role_based_permissions_and_branch_isolation(self):
        """Test branch isolation for Managers."""
        # Manager A1 (assigned to Branch A1)
        self.client.force_authenticate(user=self.manager_a1)
        
        response = self.client.get(self.invoice_ledger_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data:
            self.assertEqual(item['branch'], self.branch_a1.id)

    def test_aggregation_accuracy(self):
        """Verify GST aggregation logic accuracy."""
        self.client.force_authenticate(user=self.owner_a)
        
        test_date = datetime(2025, 6, 15, 10, 0, 0)
        test_month, test_year = 6, 2025
        
        # Use existing objects but update them for this test month to avoid IntegrityErrors
        inv = self.invoice_branch_a1
        gst_s = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv.gst = gst_s
        inv.total_amount = 118
        inv.sub_total = 100
        inv.save()
        Invoice.objects.filter(id=inv.id).update(created_at=test_date)
        
        # Trigger Aggregation
        from apps.gst_management.tasks import update_gst_summary_task
        update_gst_summary_task(self.business_a.id, test_month, test_year)
        
        summary = MonthlyGSTSummary.objects.get(business=self.business_a, month=test_month, year=test_year)
        
        # Check sales
        self.assertEqual(summary.total_tax_collected, Decimal("18.00"))
        self.assertEqual(summary.total_sales, Decimal("118.00"))
