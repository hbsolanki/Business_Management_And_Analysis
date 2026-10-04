from decimal import Decimal
from django.utils import timezone

from apps.base.tests import BaseTestCase
from apps.payment.serializers import (
    PaymentSerializer,
    InvoicePaymentSerializer,
    OfflineInvoicePaymentSerializer,
    RefundPaymentSerializer,
    SyncInvoicePaymentStatusSerializer,
)
from apps.payment.models import Payment, PaymentGatewayDetail, InvoicePayment
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType, PaymentGateway
)


class PaymentSerializerTestCase(BaseTestCase):
    """Test Payment serializer validation and creation."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_serialize_payment(self):
        """Test serializing a payment."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a
        )
        serializer = PaymentSerializer(payment)
        self.assertEqual(serializer.data["id"], payment.id)
        self.assertEqual(serializer.data["amount"], "1000.00")
        self.assertEqual(serializer.data["status"], PaymentStatus.SUCCEEDED)

    def test_payment_serializer_nested_gateway_detail(self):
        """Test payment serializer includes nested gateway detail."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a
        )
        gateway_detail = PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="pi_123",
            created_by=self.owner_a
        )
        serializer = PaymentSerializer(payment)
        self.assertIn("gateway_detail", serializer.data)
        self.assertEqual(serializer.data["gateway_detail"]["id"], gateway_detail.id)


class InvoicePaymentSerializerTestCase(BaseTestCase):
    """Test InvoicePayment serializer."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_create_invoice_payment(self):
        """Test creating an invoice payment."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            currency="INR",
            created_by=self.owner_a
        )
        data = {
            "invoice_id": self.invoice_branch_a1.id,
            "payment_id": payment.id,
        }
        serializer = InvoicePaymentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        invoice_payment = serializer.save(created_by=self.owner_a)
        self.assertEqual(invoice_payment.invoice, self.invoice_branch_a1)
        self.assertEqual(invoice_payment.payment, payment)


class OfflineInvoicePaymentSerializerTestCase(BaseTestCase):
    """Test offline invoice payment serializer."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()

    def test_create_offline_payment_cash(self):
        """Test creating offline CASH payment."""
        data = {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": Decimal("10.00"),
            "notes": "Cash received",
        }
        serializer = OfflineInvoicePaymentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_offline_payment_invalid_amount(self):
        """Test offline payment with invalid amount."""
        data = {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": Decimal("-100.00"),
        }
        serializer = OfflineInvoicePaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
