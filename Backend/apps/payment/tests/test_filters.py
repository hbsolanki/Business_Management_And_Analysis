from datetime import timedelta
from django.utils import timezone
from decimal import Decimal

from apps.base.tests import BaseTestCase
from apps.payment.models import Payment, InvoicePayment
from apps.payment.filters import PaymentFilter, InvoicePaymentFilter
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType
)


class PaymentFilterTestCase(BaseTestCase):
    """Test PaymentFilter with all combinations using BaseTestCase setup."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_filter_by_single_status(self):
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a,
        )
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.FAILED,
            amount=Decimal("500.00"),
            currency="INR",
            created_by=self.owner_a,
        )

        filterset = PaymentFilter(data={"status": PaymentStatus.SUCCEEDED}, queryset=Payment.objects.filter(business=self.business_a))
        expected_count = Payment.objects.filter(business=self.business_a, status=PaymentStatus.SUCCEEDED).count()
        self.assertEqual(filterset.qs.count(), expected_count)

    def test_filter_by_multiple_statuses(self):
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a,
        )
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("500.00"),
            currency="INR",
            created_by=self.owner_a,
        )
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.FAILED,
            amount=Decimal("250.00"),
            currency="INR",
            created_by=self.owner_a,
        )

        filterset = PaymentFilter(
            data={"status": f"{PaymentStatus.SUCCEEDED},{PaymentStatus.PENDING}"},
            queryset=Payment.objects.filter(business=self.business_a),
        )
        expected_count = Payment.objects.filter(
            business=self.business_a,
            status__in=[PaymentStatus.SUCCEEDED, PaymentStatus.PENDING]
        ).count()
        self.assertEqual(filterset.qs.count(), expected_count)

    def test_filter_by_single_method(self):
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a,
        )
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CASH,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("500.00"),
            currency="INR",
            created_by=self.owner_a,
        )

        filterset = PaymentFilter(data={"method": PaymentMethod.CARD}, queryset=Payment.objects.filter(business=self.business_a))
        expected_count = Payment.objects.filter(business=self.business_a, method=PaymentMethod.CARD).count()
        self.assertEqual(filterset.qs.count(), expected_count)

    def test_filter_combination_all_parameters(self):
        now = timezone.now()
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_at=now,
            created_by=self.owner_a,
        )
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("500.00"),
            currency="INR",
            created_at=now - timedelta(days=10),
            created_by=self.owner_a,
        )

        filterset = PaymentFilter(
            data={
                "status": f"{PaymentStatus.SUCCEEDED},{PaymentStatus.PENDING}",
                "method": PaymentMethod.CARD,
                "from_date": now - timedelta(days=5),
                "to_date": now + timedelta(days=1),
            },
            queryset=Payment.objects.filter(business=self.business_a),
        )
        expected_count = Payment.objects.filter(
            business=self.business_a,
            status__in=[PaymentStatus.SUCCEEDED, PaymentStatus.PENDING],
            method=PaymentMethod.CARD,
            created_at__range=(now - timedelta(days=5), now + timedelta(days=1))
        ).count()
        self.assertEqual(filterset.qs.count(), expected_count)


class InvoicePaymentFilterTestCase(BaseTestCase):
    """Test InvoicePaymentFilter with all combinations."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_filter_invoice_payment_by_status_and_method(self):
        invoice = self.invoice_branch_a1
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a,
        )
        InvoicePayment.objects.create(invoice=invoice, payment=payment, created_by=self.owner_a)

        filterset = InvoicePaymentFilter(
            data={
                "status": PaymentStatus.SUCCEEDED,
                "method": PaymentMethod.CARD,
            },
            queryset=InvoicePayment.objects.filter(invoice__business=self.business_a)
        )
        expected_count = InvoicePayment.objects.filter(
            invoice__business=self.business_a,
            payment__status=PaymentStatus.SUCCEEDED,
            payment__method=PaymentMethod.CARD
        ).count()
        self.assertEqual(filterset.qs.count(), expected_count)

    def test_filter_empty_result(self):
        """Test filtering with no matching results."""
        filterset = InvoicePaymentFilter(
            data={"status": PaymentStatus.FAILED},
            queryset=InvoicePayment.objects.filter(invoice__business=self.business_a)
        )
        expected_count = InvoicePayment.objects.filter(
            invoice__business=self.business_a,
            payment__status=PaymentStatus.FAILED
        ).count()
        self.assertEqual(filterset.qs.count(), expected_count)
