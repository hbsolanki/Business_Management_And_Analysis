from decimal import Decimal
from datetime import date, timedelta, datetime
from django.utils import timezone
from unittest.mock import patch
from apps.base.tests import BaseTestCase
from apps.cost.tasks import daily_financial_summary_update
from apps.cost.utils.financial_summary_update import end_month_finance_update
from apps.cost.models import MonthlyProductPerformance
from apps.invoice.models import Invoice


class CostTasksTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        
    @patch('apps.cost.tasks.date')
    def test_daily_financial_summary_update(self, mock_date):
        """Daily summary."""
        # Setup: All invoices moved to yesterday relative to our mock date
        mock_today = date(2026, 5, 1)
        prev_date = mock_today - timedelta(days=1)
        
        # Use a timezone-aware datetime for the invoices
        invoice_date = timezone.make_aware(datetime(prev_date.year, prev_date.month, prev_date.day, 12, 0, 0))
        Invoice.objects.all().update(created_at=invoice_date)
        
        # Setup: Create operating expenses for March
        summary_a1 = self.summary_branch_a1
        summary_a2 = self.summary_branch_a2
        summary_b1 = self.summary_branch_b1
        summary_b2 = self.summary_branch_b2
        
        # Reset seeded cumulative fields to 0 so we can test the task's aggregation accurately
        for s in [summary_a1, summary_a2, summary_b1, summary_b2]:
            s.total_revenue = Decimal("0.00")
            s.cost_of_goods_sold = Decimal("0.00")
            s.output_gst = Decimal("0.00")
            s.input_gst = Decimal("0.00")
            s.invoice_count = 0 
            s.save()
        
        from apps.cost.models import Expense
        category_a = self.cost_category_a
        category_b = self.cost_category_b

        # Create Expenses for Business A
        Expense.objects.create(business=self.business_a, branch=self.summary_branch_a1.branch, category=category_a, amount=Decimal("1000.00"), total_amount=Decimal("1000.00"), date=date(2026, 4, 10), title="Exp A1")
        Expense.objects.create(business=self.business_a, branch=self.summary_branch_a2.branch, category=category_a, amount=Decimal("2000.00"), total_amount=Decimal("2000.00"), date=date(2026, 4, 10), title="Exp A2")

        # Create Expenses for Business B
        Expense.objects.create(business=self.business_b, branch=self.summary_branch_b1.branch, category=category_b, amount=Decimal("1000.00"), total_amount=Decimal("1000.00"), date=date(2026, 4, 10), title="Exp B1")
        Expense.objects.create(business=self.business_b, branch=self.summary_branch_b2.branch, category=category_b, amount=Decimal("2000.00"), total_amount=Decimal("2000.00"), date=date(2026, 4, 10), title="Exp B2")

        # Step: Run task for today (processes yesterday's invoices)
        # Mock as May 1st so it triggers end_month_finance_update for April
        mock_date.today.return_value = date(2026, 5, 1)
        prev_date = mock_date.today.return_value - timedelta(days=1)
        
        # Ensure summaries match the month we are testing (April 2026)
        for s in [summary_a1, summary_a2, summary_b1, summary_b2]:
            s.year = prev_date.year
            s.month = prev_date.month
            s.save()

        daily_financial_summary_update()
        
        # Read: Business A - Branch A1
        summary_a1 = self.summary_branch_a1
        summary_a1.refresh_from_db()
        self.assertEqual(summary_a1.total_revenue, Decimal("830.00"))
        self.assertEqual(summary_a1.cost_of_goods_sold, Decimal("80.00"))
        self.assertEqual(summary_a1.output_gst, Decimal("165.00")) 
        self.assertEqual(summary_a1.input_gst, Decimal("0.00")) 
        self.assertEqual(summary_a1.operating_expenses, Decimal("1000.00"))
        self.assertEqual(summary_a1.salary_expenses, Decimal("8000.00"))
        self.assertEqual(summary_a1.gross_profit, Decimal("750.00")) # 830 - 80
        self.assertEqual(summary_a1.net_profit_before_tax, Decimal("-8250.00")) # 750 - 9000
        self.assertEqual(summary_a1.invoice_count, 4)
        
        perf_a1_p1 = MonthlyProductPerformance.objects.get(monthly_summary=summary_a1, product=self.product_a1)
        self.assertEqual(perf_a1_p1.quantity, Decimal("13"))
        self.assertEqual(perf_a1_p1.cost, Decimal("65.00"))
        self.assertEqual(perf_a1_p1.revenue, Decimal("550.00"))

        perf_a1_p2 = MonthlyProductPerformance.objects.get(monthly_summary=summary_a1, product=self.product_a2)
        self.assertEqual(perf_a1_p2.quantity, Decimal("1"))
        self.assertEqual(perf_a1_p2.cost, Decimal("15.00"))
        self.assertEqual(perf_a1_p2.revenue, Decimal("100.00"))

        # Read: Business A - Branch A2
        summary_a2 = self.summary_branch_a2
        summary_a2.refresh_from_db()
        self.assertEqual(summary_a2.total_revenue, Decimal("850.00"))
        self.assertEqual(summary_a2.cost_of_goods_sold, Decimal("90.00"))
        self.assertEqual(summary_a2.output_gst, Decimal("158.00"))
        self.assertEqual(summary_a2.input_gst, Decimal("0.00"))
        self.assertEqual(summary_a2.operating_expenses, Decimal("2000.00"))
        self.assertEqual(summary_a1.salary_expenses, Decimal("8000.00"))
        self.assertEqual(summary_a2.invoice_count, 3)
        
        perf_a2 = MonthlyProductPerformance.objects.get(monthly_summary=summary_a2, product=self.product_a2)
        self.assertEqual(perf_a2.quantity, Decimal("6"))
        self.assertEqual(perf_a2.cost, Decimal("90.00"))
        self.assertEqual(perf_a2.revenue, Decimal("600.00"))

        # Read: Business B - Branch B1
        summary_b1 = self.summary_branch_b1
        summary_b1.refresh_from_db()
        self.assertEqual(summary_b1.total_revenue, Decimal("250.00"))
        self.assertEqual(summary_b1.cost_of_goods_sold, Decimal("30.00"))
        self.assertEqual(summary_b1.output_gst, Decimal("45.00"))
        self.assertEqual(summary_b1.input_gst, Decimal("0.00"))
        self.assertEqual(summary_b1.gst_payable, Decimal("45.00"))
        self.assertEqual(summary_b1.operating_expenses, Decimal("1000.00"))
        self.assertEqual(summary_b1.salary_expenses, Decimal("8000.00"))
        self.assertEqual(summary_b1.total_expenses, Decimal("9000.00"))
        self.assertEqual(summary_b1.gross_profit, Decimal("220.00"))
        self.assertEqual(summary_b1.net_profit_before_tax, Decimal("-8780.00"))
        self.assertEqual(summary_b1.invoice_count, 2)

        # Read: Business B - Branch B2
        summary_b2 = self.summary_branch_b2
        summary_b2.refresh_from_db()
        self.assertEqual(summary_b2.total_revenue, Decimal("600.00"))
        self.assertEqual(summary_b2.cost_of_goods_sold, Decimal("90.00"))
        self.assertEqual(summary_b2.output_gst, Decimal("108.00"))
        self.assertEqual(summary_b2.input_gst, Decimal("0.00"))
        self.assertEqual(summary_b2.gst_payable, Decimal("108.00"))
        self.assertEqual(summary_b2.operating_expenses, Decimal("2000.00"))
        self.assertEqual(summary_b2.salary_expenses, Decimal("8000.00"))
        self.assertEqual(summary_b2.total_expenses, Decimal("10000.00"))
        self.assertEqual(summary_b2.gross_profit, Decimal("510.00"))
        self.assertEqual(summary_b2.net_profit_before_tax, Decimal("-9490.00"))
        self.assertEqual(summary_b2.invoice_count, 2)
        
        perf_b2 = MonthlyProductPerformance.objects.get(
            monthly_summary=summary_b2,
            product=self.product_b2
        )
        self.assertEqual(perf_b2.quantity, Decimal("6"))
        self.assertEqual(perf_b2.cost, Decimal("90.00"))
        self.assertEqual(perf_b2.revenue, Decimal("600.00"))

    def test_end_month_finance_update(self):
        """Month update."""
        
        # Setup: Ensure manager_a1 has a specific salary for this test
        self.manager_a1.employee_details.salary = 50000
        self.manager_a1.employee_details.save()
        
        summary = self.summary_branch_a1
        summary.year = 2026
        summary.month = 2
        summary.save()
        
        from apps.cost.models import Expense
        Expense.objects.create(
            business=self.business_a,
            branch=self.branch_a1,
            category=self.cost_category_a,
            amount=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            date=date(2026, 2, 10),
            title="Test Expense"
        )
        
        # Execute
        end_month_finance_update(self.business_a.id, summary.month, summary.year)
        
        # Read
        summary.refresh_from_db()
        self.assertEqual(summary.operating_expenses, Decimal("5000.00"))
        self.assertEqual(summary.salary_expenses, Decimal("53000.00")) # 50000 (manager) + 3000 (employee)
