from decimal import Decimal
from datetime import datetime
from apps.base.tests import BaseTestCase
from apps.gst_management.models import MonthlyGSTSummary
from apps.gst_management.tasks import update_gst_summary_task
from apps.invoice.models import Invoice
from apps.base.models import GST

class GSTTasksComprehensiveTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_task_full_aggregation_flow(self):
        """
        End-to-end test: Create data, run Celery task, and verify summary records.
        """
        # 1. Setup Test Data for a specific month
        test_date = datetime(2025, 7, 20, 10, 0, 0)
        test_month, test_year = 7, 2025
        
        # Invoice for Business A
        gst_a = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv_a = Invoice.objects.create(
            business=self.business_a, branch=self.branch_a1,
            total_amount=118, sub_total=100, gst=gst_a
        )
        Invoice.objects.filter(id=inv_a.id).update(created_at=test_date)
        
        # Invoice for Business B
        gst_b = GST.objects.create(gst_rate=18, gst_amount=36, total_amount=236)
        inv_b = Invoice.objects.create(
            business=self.business_b, branch=self.branch_b1,
            total_amount=236, sub_total=200, gst=gst_b
        )
        Invoice.objects.filter(id=inv_b.id).update(created_at=test_date)
        
        # 2. Run Task for Business A only
        update_gst_summary_task(business_id=self.business_a.id, month=test_month, year=test_year)
        
        # Verify Summary A exists and is correct
        summary_a = MonthlyGSTSummary.objects.get(business=self.business_a, month=test_month, year=test_year)
        self.assertEqual(summary_a.total_sales, Decimal("118.00"))
        
        # Verify Summary B DOES NOT exist yet (as we only ran for A)
        self.assertFalse(MonthlyGSTSummary.objects.filter(business=self.business_b, month=test_month, year=test_year).exists())
        
        # 3. Run Task for ALL businesses
        update_gst_summary_task(business_id=None, month=test_month, year=test_year)
        
        # Verify Summary B now exists and is correct
        summary_b = MonthlyGSTSummary.objects.get(business=self.business_b, month=test_month, year=test_year)
        self.assertEqual(summary_b.total_sales, Decimal("236.00"))

    def test_task_handles_multiple_branches(self):
        """
        Verify that the task correctly aggregates data across all branches of a business.
        """
        test_date = datetime(2025, 8, 15, 12, 0, 0)
        test_month, test_year = 8, 2025
        
        # Invoice in Branch 1
        gst1 = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv1 = Invoice.objects.create(business=self.business_a, branch=self.branch_a1, total_amount=118, sub_total=100, gst=gst1)
        Invoice.objects.filter(id=inv1.id).update(created_at=test_date)
        
        # Invoice in Branch 2
        gst2 = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv2 = Invoice.objects.create(business=self.business_a, branch=self.branch_a2, total_amount=118, sub_total=100, gst=gst2)
        Invoice.objects.filter(id=inv2.id).update(created_at=test_date)
        
        # Run Task
        update_gst_summary_task(business_id=self.business_a.id, month=test_month, year=test_year)
        
        summary = MonthlyGSTSummary.objects.get(business=self.business_a, month=test_month, year=test_year)
        self.assertEqual(summary.total_sales, Decimal("236.00"))
        self.assertEqual(summary.total_tax_collected, Decimal("36.00"))

    def test_task_idempotency(self):
        """
        Verify that running the task multiple times correctly updates the existing summary
        rather than creating duplicates.
        """
        test_month, test_year = 9, 2025
        
        # Initial run (empty)
        update_gst_summary_task(business_id=self.business_a.id, month=test_month, year=test_year)
        initial_id = MonthlyGSTSummary.objects.get(business=self.business_a, month=test_month, year=test_year).id
        
        # Second run after data change
        gst = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv = Invoice.objects.create(
            business=self.business_a, branch=self.branch_a1,
            total_amount=118, sub_total=100, gst=gst
        )
        Invoice.objects.filter(id=inv.id).update(created_at=datetime(2025, 9, 10))
        
        update_gst_summary_task(business_id=self.business_a.id, month=test_month, year=test_year)
        
        summary = MonthlyGSTSummary.objects.get(business=self.business_a, month=test_month, year=test_year)
        self.assertEqual(summary.id, initial_id) # Should be the same record
        self.assertEqual(summary.total_sales, Decimal("118.00"))
