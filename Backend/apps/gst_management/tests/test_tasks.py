import pytest
from decimal import Decimal
from datetime import datetime
from apps.base.tests import BaseTestCase
from apps.gst_management.models import MonthlyGSTSummary
from apps.gst_management.tasks import update_gst_summary_task
from apps.invoice.models import Invoice
from apps.base.models import GST


@pytest.fixture
def gst_task_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestGSTTasksComprehensivePytest:

    def test_task_full_aggregation_flow(self, gst_task_env):
        """End-to-end test: Create data, run Celery task, and verify summary records."""
        # Arrange
        test_date = datetime(2025, 7, 20, 10, 0, 0)
        test_month, test_year = 7, 2025

        gst_a = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv_a = Invoice.objects.create(
            business=gst_task_env.business_a, branch=gst_task_env.branch_a1,
            total_amount=118, sub_total=100, gst=gst_a
        )
        Invoice.objects.filter(id=inv_a.id).update(created_at=test_date)

        gst_b = GST.objects.create(gst_rate=18, gst_amount=36, total_amount=236)
        inv_b = Invoice.objects.create(
            business=gst_task_env.business_b, branch=gst_task_env.branch_b1,
            total_amount=236, sub_total=200, gst=gst_b
        )
        Invoice.objects.filter(id=inv_b.id).update(created_at=test_date)

        # Act
        update_gst_summary_task(business_id=gst_task_env.business_a.id, month=test_month, year=test_year)

        # Assert
        sut_summary_a = MonthlyGSTSummary.objects.get(business=gst_task_env.business_a, month=test_month, year=test_year)
        assert sut_summary_a.total_sales == Decimal("118.00")
        assert not MonthlyGSTSummary.objects.filter(business=gst_task_env.business_b, month=test_month, year=test_year).exists()

        # Act
        update_gst_summary_task(business_id=None, month=test_month, year=test_year)

        # Assert
        sut_summary_b = MonthlyGSTSummary.objects.get(business=gst_task_env.business_b, month=test_month, year=test_year)
        assert sut_summary_b.total_sales == Decimal("236.00")

    def test_task_handles_multiple_branches(self, gst_task_env):
        """Verify that the task correctly aggregates data across all branches of a business."""
        # Arrange
        test_date = datetime(2025, 8, 15, 12, 0, 0)
        test_month, test_year = 8, 2025

        gst1 = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv1 = Invoice.objects.create(business=gst_task_env.business_a, branch=gst_task_env.branch_a1, total_amount=118, sub_total=100, gst=gst1)
        Invoice.objects.filter(id=inv1.id).update(created_at=test_date)

        gst2 = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv2 = Invoice.objects.create(business=gst_task_env.business_a, branch=gst_task_env.branch_a2, total_amount=118, sub_total=100, gst=gst2)
        Invoice.objects.filter(id=inv2.id).update(created_at=test_date)

        # Act
        update_gst_summary_task(business_id=gst_task_env.business_a.id, month=test_month, year=test_year)

        # Assert
        sut_summary = MonthlyGSTSummary.objects.get(business=gst_task_env.business_a, month=test_month, year=test_year)
        assert sut_summary.total_sales == Decimal("236.00")
        assert sut_summary.total_tax_collected == Decimal("36.00")

    def test_task_idempotency(self, gst_task_env):
        """Verify that running the task multiple times correctly updates the existing summary rather than creating duplicates."""
        # Arrange
        test_month, test_year = 9, 2025

        # Act (initial run)
        update_gst_summary_task(business_id=gst_task_env.business_a.id, month=test_month, year=test_year)
        sut_initial_id = MonthlyGSTSummary.objects.get(business=gst_task_env.business_a, month=test_month, year=test_year).id

        # Arrange (add data)
        gst = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv = Invoice.objects.create(
            business=gst_task_env.business_a, branch=gst_task_env.branch_a1,
            total_amount=118, sub_total=100, gst=gst
        )
        Invoice.objects.filter(id=inv.id).update(created_at=datetime(2025, 9, 10))

        # Act (second run)
        update_gst_summary_task(business_id=gst_task_env.business_a.id, month=test_month, year=test_year)

        # Assert
        sut_summary = MonthlyGSTSummary.objects.get(business=gst_task_env.business_a, month=test_month, year=test_year)
        assert sut_summary.id == sut_initial_id
        assert sut_summary.total_sales == Decimal("118.00")
