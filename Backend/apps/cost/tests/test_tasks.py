import pytest
from decimal import Decimal
from datetime import date, timedelta, datetime
from django.utils import timezone
from unittest.mock import patch
from apps.base.tests import BaseTestCase
from apps.cost.tasks import daily_financial_summary_update
from apps.cost.utils.financial_summary_update import end_month_finance_update
from apps.cost.models import MonthlyProductPerformance, Expense
from apps.invoice.models import Invoice


@pytest.fixture
def env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestCostTasks:

    @patch('apps.cost.tasks.date')
    def test_daily_financial_summary_update(self, mock_date, env):
        # Arrange
        mock_today = date(2026, 5, 1)
        prev_date = mock_today - timedelta(days=1)
        invoice_date = timezone.make_aware(datetime(prev_date.year, prev_date.month, prev_date.day, 12, 0, 0))
        Invoice.objects.all().update(created_at=invoice_date)

        summary_a1 = env.summary_branch_a1
        summary_a2 = env.summary_branch_a2
        summary_b1 = env.summary_branch_b1
        summary_b2 = env.summary_branch_b2

        for s in [summary_a1, summary_a2, summary_b1, summary_b2]:
            s.total_revenue = Decimal("0.00")
            s.cost_of_goods_sold = Decimal("0.00")
            s.output_gst = Decimal("0.00")
            s.input_gst = Decimal("0.00")
            s.invoice_count = 0
            s.year = prev_date.year
            s.month = prev_date.month
            s.save()

        category_a = env.cost_category_a
        category_b = env.cost_category_b

        Expense.objects.create(business=env.business_a, branch=env.summary_branch_a1.branch, category=category_a, amount=Decimal("1000.00"), total_amount=Decimal("1000.00"), date=date(2026, 4, 10), title="Exp A1")
        Expense.objects.create(business=env.business_a, branch=env.summary_branch_a2.branch, category=category_a, amount=Decimal("2000.00"), total_amount=Decimal("2000.00"), date=date(2026, 4, 10), title="Exp A2")
        Expense.objects.create(business=env.business_b, branch=env.summary_branch_b1.branch, category=category_b, amount=Decimal("1000.00"), total_amount=Decimal("1000.00"), date=date(2026, 4, 10), title="Exp B1")
        Expense.objects.create(business=env.business_b, branch=env.summary_branch_b2.branch, category=category_b, amount=Decimal("2000.00"), total_amount=Decimal("2000.00"), date=date(2026, 4, 10), title="Exp B2")

        mock_date.today.return_value = date(2026, 5, 1)

        # Act
        daily_financial_summary_update()

        # Assert - Business A - Branch A1
        summary_a1.refresh_from_db()
        assert summary_a1.total_revenue == Decimal("830.00")
        assert summary_a1.cost_of_goods_sold == Decimal("80.00")
        assert summary_a1.output_gst == Decimal("165.00")
        assert summary_a1.input_gst == Decimal("0.00")
        assert summary_a1.operating_expenses == Decimal("1000.00")
        assert summary_a1.salary_expenses == Decimal("8000.00")
        assert summary_a1.gross_profit == Decimal("750.00")
        assert summary_a1.net_profit_before_tax == Decimal("-8250.00")
        assert summary_a1.invoice_count == 4

        perf_a1_p1 = MonthlyProductPerformance.objects.get(monthly_summary=summary_a1, product=env.product_a1)
        assert perf_a1_p1.quantity == Decimal("13")
        assert perf_a1_p1.cost == Decimal("65.00")
        assert perf_a1_p1.revenue == Decimal("550.00")

        perf_a1_p2 = MonthlyProductPerformance.objects.get(monthly_summary=summary_a1, product=env.product_a2)
        assert perf_a1_p2.quantity == Decimal("1")
        assert perf_a1_p2.cost == Decimal("15.00")
        assert perf_a1_p2.revenue == Decimal("100.00")

        # Assert - Business A - Branch A2
        summary_a2.refresh_from_db()
        assert summary_a2.total_revenue == Decimal("850.00")
        assert summary_a2.cost_of_goods_sold == Decimal("90.00")
        assert summary_a2.output_gst == Decimal("158.00")
        assert summary_a2.input_gst == Decimal("0.00")
        assert summary_a2.operating_expenses == Decimal("2000.00")
        assert summary_a1.salary_expenses == Decimal("8000.00")
        assert summary_a2.invoice_count == 3

        perf_a2 = MonthlyProductPerformance.objects.get(monthly_summary=summary_a2, product=env.product_a2)
        assert perf_a2.quantity == Decimal("6")
        assert perf_a2.cost == Decimal("90.00")
        assert perf_a2.revenue == Decimal("600.00")

        # Assert - Business B - Branch B1
        summary_b1.refresh_from_db()
        assert summary_b1.total_revenue == Decimal("250.00")
        assert summary_b1.cost_of_goods_sold == Decimal("30.00")
        assert summary_b1.output_gst == Decimal("45.00")
        assert summary_b1.input_gst == Decimal("0.00")
        assert summary_b1.gst_payable == Decimal("45.00")
        assert summary_b1.operating_expenses == Decimal("1000.00")
        assert summary_b1.salary_expenses == Decimal("8000.00")
        assert summary_b1.total_expenses == Decimal("9000.00")
        assert summary_b1.gross_profit == Decimal("220.00")
        assert summary_b1.net_profit_before_tax == Decimal("-8780.00")
        assert summary_b1.invoice_count == 2

        # Assert - Business B - Branch B2
        summary_b2.refresh_from_db()
        assert summary_b2.total_revenue == Decimal("600.00")
        assert summary_b2.cost_of_goods_sold == Decimal("90.00")
        assert summary_b2.output_gst == Decimal("108.00")
        assert summary_b2.input_gst == Decimal("0.00")
        assert summary_b2.gst_payable == Decimal("108.00")
        assert summary_b2.operating_expenses == Decimal("2000.00")
        assert summary_b2.salary_expenses == Decimal("8000.00")
        assert summary_b2.total_expenses == Decimal("10000.00")
        assert summary_b2.gross_profit == Decimal("510.00")
        assert summary_b2.net_profit_before_tax == Decimal("-9490.00")
        assert summary_b2.invoice_count == 2

        perf_b2 = MonthlyProductPerformance.objects.get(
            monthly_summary=summary_b2,
            product=env.product_b2
        )
        assert perf_b2.quantity == Decimal("6")
        assert perf_b2.cost == Decimal("90.00")
        assert perf_b2.revenue == Decimal("600.00")

    def test_end_month_finance_update(self, env):
        # Arrange
        env.manager_a1.employee_details.salary = 50000
        env.manager_a1.employee_details.save()

        summary = env.summary_branch_a1
        summary.year = 2026
        summary.month = 2
        summary.save()

        Expense.objects.create(
            business=env.business_a,
            branch=env.branch_a1,
            category=env.cost_category_a,
            amount=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            date=date(2026, 2, 10),
            title="Test Expense"
        )

        # Act
        end_month_finance_update(env.business_a.id, summary.month, summary.year)

        # Assert
        summary.refresh_from_db()
        assert summary.operating_expenses == Decimal("5000.00")
        assert summary.salary_expenses == Decimal("53000.00")
