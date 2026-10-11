from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.base.tests import BaseTestCase
from apps.cost.models import MonthlyFinancialSummary, MonthlyProductPerformance
from apps.cost.utils.financial_summary_update import (
    end_month_finance_update,
    financial_summary_update,
)
from apps.invoice.models import Invoice, ProductInvoice


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
class TestFinancialSummaryUpdate:
    def test_end_month_finance_update(self):
        # Arrange
        with patch("apps.gst_management.utils.aggregate_monthly_data") as mock_agg:
            mock_agg.return_value = {"status": "success"}

            # Act
            sut_res = end_month_finance_update(business_id=1, month=5, year=2026)

            # Assert
            assert sut_res == {"status": "success"}
            mock_agg.assert_called_once_with(month=5, year=2026, business_id=1)

    def test_financial_summary_update_new_month(self, env):
        # Arrange
        today = date(2026, 6, 15)
        prev_date = today - timedelta(days=1)
        invoice_date = timezone.make_aware(datetime(prev_date.year, prev_date.month, prev_date.day, 10, 0, 0))
        Invoice.objects.all().update(created_at=invoice_date)

        # Clear existing monthly summary for this month to trigger new_month = True
        MonthlyFinancialSummary.objects.filter(year=2026, month=6).delete()

        # Act
        sut_msg = financial_summary_update(today=today, month=6, year=2026)

        # Assert
        assert f"Daily financial summary updated for {today}" in sut_msg
        summary = MonthlyFinancialSummary.objects.filter(
            business=env.business_a, branch=env.branch_a1, year=2026, month=6
        ).first()
        assert summary is not None
        assert summary.invoice_count >= 1

    @patch("apps.cost.utils.financial_summary_update.end_month_finance_update")
    def test_financial_summary_update_existing_month_first_day(self, mock_end_month, env):
        # Arrange
        today = date(2026, 7, 1)  # today.day == 1 triggers end_month_finance_update
        prev_date = today - timedelta(days=1)
        invoice_date = timezone.make_aware(datetime(prev_date.year, prev_date.month, prev_date.day, 10, 0, 0))
        Invoice.objects.all().update(created_at=invoice_date)

        # Ensure summary already exists to trigger the else branch (new_month = False)
        for branch in [env.branch_a1, env.branch_a2, env.branch_b1, env.branch_b2]:
            MonthlyFinancialSummary.objects.get_or_create(
                business=branch.business,
                branch=branch,
                year=2026,
                month=7,
                defaults={
                    "total_revenue": Decimal("500.00"),
                    "cost_of_goods_sold": Decimal("100.00"),
                    "input_gst": Decimal("10.00"),
                    "output_gst": Decimal("20.00"),
                    "invoice_count": 1,
                },
            )

        # Act
        sut_msg = financial_summary_update(today=today, month=7, year=2026)

        # Assert
        assert f"Daily financial summary updated for {today}" in sut_msg
        assert mock_end_month.called
