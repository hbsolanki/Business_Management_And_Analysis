import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from decimal import Decimal
from django.utils import timezone
from datetime import datetime
from apps.base.tests import BaseTestCase
from apps.gst_management.models import MonthlyGSTSummary
from apps.invoice.models import Invoice
from apps.supplier.models import OrderStatus
from apps.cost.models import Expense
from apps.base.models import GST
from apps.gst_management.tasks import update_gst_summary_task


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def gst_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()

    # Create some Expenses with GST for testing
    expense_gst = GST.objects.create(
        gst_rate=Decimal("18.0"),
        gst_amount=Decimal("18.0"),
        total_amount=Decimal("118.0")
    )
    tc.expense_a = Expense.objects.create(
        business=tc.business_a,
        branch=tc.branch_a1,
        category=tc.cost_category_a,
        title="Office Rent",
        amount=Decimal("100.0"),
        date=timezone.now().date(),
        gst=expense_gst
    )
    return tc


@pytest.mark.django_db
class TestGSTSummaryPytest:

    def test_summary_list_and_filtering(self, api_client, gst_env):
        """Test retrieving and filtering monthly GST summaries."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=gst_env.owner_a)
        now = timezone.now()
        update_gst_summary_task(gst_env.business_a.id, now.month, now.year)
        sut_url = reverse('gst-summary-list')

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        results = sut_response.data
        if len(results) == 0:
            update_gst_summary_task(gst_env.business_a.id, now.month, now.year)
            sut_response = sut_client.get(sut_url)
            results = sut_response.data
        assert len(results) >= 1

        # Arrange
        sut_filter_url = f"{sut_url}?month={now.month}&year={now.year}"

        # Act
        sut_filter_response = sut_client.get(sut_filter_url)

        # Assert
        assert sut_filter_response.status_code == status.HTTP_200_OK
        filtered_results = sut_filter_response.data
        assert len(filtered_results) >= 1
        assert filtered_results[0]['month'] == now.month
        assert filtered_results[0]['year'] == now.year

    def test_ledger_filtering_combinations(self, api_client, gst_env):
        """Test various filtering combinations for ledgers."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=gst_env.owner_a)
        sut_invoice_ledger_url = f"{reverse('gst-summary-invoices')}?branch={gst_env.branch_a1.id}"

        # Act
        sut_response = sut_client.get(sut_invoice_ledger_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        for item in sut_response.data:
            assert item['branch'] == gst_env.branch_a1.id

        # Arrange
        gst_env.po_a1.status = OrderStatus.DELIVERED
        gst_env.po_a1.received_at = timezone.now()
        gst_env.po_a1.save()
        supplier_name = gst_env.supplier_a1.name
        sut_po_ledger_url = f"{reverse('gst-summary-purchase-orders')}?supplier_name={supplier_name}"

        # Act
        sut_po_response = sut_client.get(sut_po_ledger_url)

        # Assert
        assert sut_po_response.status_code == status.HTTP_200_OK
        for item in sut_po_response.data:
            assert item['party_name'] == supplier_name

    def test_cross_business_isolation(self, api_client, gst_env):
        """Ensure Business A cannot see Business B's data."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=gst_env.owner_a)
        sut_url = f"{reverse('gst-summary-invoices')}?branch={gst_env.branch_b1.id}"

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert len(sut_response.data) == 0

    def test_role_based_permissions_and_branch_isolation(self, api_client, gst_env):
        """Test branch isolation for Managers."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=gst_env.manager_a1)
        sut_url = reverse('gst-summary-invoices')

        # Act
        sut_response = sut_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        for item in sut_response.data:
            assert item['branch'] == gst_env.branch_a1.id

    def test_aggregation_accuracy(self, api_client, gst_env):
        """Verify GST aggregation logic accuracy."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=gst_env.owner_a)
        test_date = datetime(2025, 6, 15, 10, 0, 0)
        test_month, test_year = 6, 2025

        inv = gst_env.invoice_branch_a1
        gst_s = GST.objects.create(gst_rate=18, gst_amount=18, total_amount=118)
        inv.gst = gst_s
        inv.total_amount = 118
        inv.sub_total = 100
        inv.save()
        Invoice.objects.filter(id=inv.id).update(created_at=test_date)

        # Act
        update_gst_summary_task(gst_env.business_a.id, test_month, test_year)
        sut_summary = MonthlyGSTSummary.objects.get(business=gst_env.business_a, month=test_month, year=test_year)

        # Assert
        assert sut_summary.total_tax_collected == Decimal("18.00")
        assert sut_summary.total_sales == Decimal("118.00")
