import pytest
from datetime import timedelta
from django.utils import timezone
from decimal import Decimal

from apps.base.tests import BaseTestCase
from apps.payment.models import Payment, InvoicePayment
from apps.payment.filters import PaymentFilter, InvoicePaymentFilter
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType
)


@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestPaymentFilter:
    """Test PaymentFilter with all combinations using BaseTestCase setup."""

    def test_filter_by_single_status(self, env):
        # Arrange
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.FAILED,
            amount=Decimal("500.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        expected_count = Payment.objects.filter(business=env.business_a, status=PaymentStatus.SUCCEEDED).count()

        # Act
        sut_filterset = PaymentFilter(
            data={"status": PaymentStatus.SUCCEEDED},
            queryset=Payment.objects.filter(business=env.business_a)
        )
        
        # Assert
        assert sut_filterset.qs.count() == expected_count

    def test_filter_by_multiple_statuses(self, env):
        # Arrange
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("500.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.FAILED,
            amount=Decimal("250.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        expected_count = Payment.objects.filter(
            business=env.business_a,
            status__in=[PaymentStatus.SUCCEEDED, PaymentStatus.PENDING]
        ).count()

        # Act
        sut_filterset = PaymentFilter(
            data={"status": f"{PaymentStatus.SUCCEEDED},{PaymentStatus.PENDING}"},
            queryset=Payment.objects.filter(business=env.business_a),
        )
        
        # Assert
        assert sut_filterset.qs.count() == expected_count

    def test_filter_by_single_method(self, env):
        # Arrange
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CASH,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("500.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        expected_count = Payment.objects.filter(business=env.business_a, method=PaymentMethod.CARD).count()

        # Act
        sut_filterset = PaymentFilter(
            data={"method": PaymentMethod.CARD},
            queryset=Payment.objects.filter(business=env.business_a)
        )
        
        # Assert
        assert sut_filterset.qs.count() == expected_count

    def test_filter_combination_all_parameters(self, env):
        # Arrange
        now = timezone.now()
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_at=now,
            created_by=env.owner_a,
        )
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("500.00"),
            currency="INR",
            created_at=now - timedelta(days=10),
            created_by=env.owner_a,
        )
        expected_count = Payment.objects.filter(
            business=env.business_a,
            status__in=[PaymentStatus.SUCCEEDED, PaymentStatus.PENDING],
            method=PaymentMethod.CARD,
            created_at__range=(now - timedelta(days=5), now + timedelta(days=1))
        ).count()

        # Act
        sut_filterset = PaymentFilter(
            data={
                "status": f"{PaymentStatus.SUCCEEDED},{PaymentStatus.PENDING}",
                "method": PaymentMethod.CARD,
                "from_date": now - timedelta(days=5),
                "to_date": now + timedelta(days=1),
            },
            queryset=Payment.objects.filter(business=env.business_a),
        )
        
        # Assert
        assert sut_filterset.qs.count() == expected_count


@pytest.mark.django_db
class TestInvoicePaymentFilter:
    """Test InvoicePaymentFilter with all combinations."""

    def test_filter_invoice_payment_by_status_and_method(self, env):
        # Arrange
        invoice = env.invoice_branch_a1
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=env.owner_a,
        )
        InvoicePayment.objects.create(invoice=invoice, payment=payment, created_by=env.owner_a)
        expected_count = InvoicePayment.objects.filter(
            invoice__business=env.business_a,
            payment__status=PaymentStatus.SUCCEEDED,
            payment__method=PaymentMethod.CARD
        ).count()

        # Act
        sut_filterset = InvoicePaymentFilter(
            data={
                "status": PaymentStatus.SUCCEEDED,
                "method": PaymentMethod.CARD,
            },
            queryset=InvoicePayment.objects.filter(invoice__business=env.business_a)
        )
        
        # Assert
        assert sut_filterset.qs.count() == expected_count

    def test_filter_empty_result(self, env):
        """Test filtering with no matching results."""
        # Arrange
        expected_count = InvoicePayment.objects.filter(
            invoice__business=env.business_a,
            payment__status=PaymentStatus.FAILED
        ).count()
        
        # Act
        sut_filterset = InvoicePaymentFilter(
            data={"status": PaymentStatus.FAILED},
            queryset=InvoicePayment.objects.filter(invoice__business=env.business_a)
        )
        
        # Assert
        assert sut_filterset.qs.count() == expected_count
