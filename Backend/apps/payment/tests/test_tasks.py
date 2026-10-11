import pytest
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from apps.base.tests import BaseTestCase
from apps.payment.models import Payment, PaymentGatewayDetail
from apps.master.utils.text_choices import PaymentStatus, PaymentMethod
from apps.payment.tasks import cleanup_stale_pending_payments
from apps.payment.utils.payment_summary import compute_payment_summary


@pytest.fixture
def payment_task_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestPaymentTasksAndSummary:

    def test_cleanup_stale_pending_payments_no_payments(self):
        """Test task when there are no stale pending payments."""
        # Arrange & Act
        cleanup_stale_pending_payments()

        # Assert
        assert Payment.objects.filter(status=PaymentStatus.CANCELLED).count() == 0

    def test_cleanup_stale_pending_payments_with_stale_records(self, payment_task_env):
        """Test task cancels pending checkout session payments older than 24 hours."""
        # Arrange
        stale_cutoff = timezone.now() - timedelta(hours=26)
        sut_payment = Payment.objects.create(
            business=payment_task_env.business_a,
            amount=Decimal("100.00"),
            status=PaymentStatus.PENDING,
            method=PaymentMethod.CARD,
        )
        PaymentGatewayDetail.objects.create(
            payment=sut_payment,
            checkout_session_id="cs_stale_123"
        )
        Payment.objects.filter(id=sut_payment.id).update(created_at=stale_cutoff)

        # Fresh payment that should not be cancelled
        fresh_payment = Payment.objects.create(
            business=payment_task_env.business_a,
            amount=Decimal("50.00"),
            status=PaymentStatus.PENDING,
            method=PaymentMethod.CARD,
        )
        PaymentGatewayDetail.objects.create(
            payment=fresh_payment,
            checkout_session_id="cs_fresh_456"
        )

        # Act
        cleanup_stale_pending_payments()

        # Assert
        sut_payment.refresh_from_db()
        fresh_payment.refresh_from_db()
        assert sut_payment.status == PaymentStatus.CANCELLED
        assert "Checkout session expired" in sut_payment.failure_reason
        assert fresh_payment.status == PaymentStatus.PENDING

    def test_compute_payment_summary_aggregates(self, payment_task_env):
        """Test compute_payment_summary function with varied statuses and methods."""
        # Arrange
        Payment.objects.create(
            business=payment_task_env.business_a,
            amount=Decimal("500.00"),
            status=PaymentStatus.SUCCEEDED,
            method=PaymentMethod.CARD,
        )
        Payment.objects.create(
            business=payment_task_env.business_a,
            amount=Decimal("300.00"),
            status=PaymentStatus.PENDING,
            method=PaymentMethod.CASH,
        )
        Payment.objects.create(
            business=payment_task_env.business_a,
            amount=Decimal("200.00"),
            status=PaymentStatus.FAILED,
            method=PaymentMethod.UPI,
        )
        sut_qs = Payment.objects.filter(business=payment_task_env.business_a)

        # Act
        sut_summary = compute_payment_summary(sut_qs)

        # Assert
        assert sut_summary["total"] == 1000.0
        assert sut_summary["totalCount"] == 3
        assert sut_summary["paid"] == 500.0
        assert sut_summary["paidCount"] == 1
        assert sut_summary["pending"] == 300.0
        assert sut_summary["pendingCount"] == 1
        assert sut_summary["refunded_failed"] == 200.0
        assert sut_summary["refunded_failed_count"] == 1
        assert sut_summary["methods"][PaymentMethod.CARD.value] == 500.0
        assert sut_summary["methods"][PaymentMethod.CASH.value] == 300.0
        assert sut_summary["methods"][PaymentMethod.UPI.value] == 200.0
