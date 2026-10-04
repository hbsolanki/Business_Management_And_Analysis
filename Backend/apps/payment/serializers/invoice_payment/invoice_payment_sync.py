from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
import logging
import stripe

from apps.base.serializers.base import BaseSerializer
from apps.payment.models import InvoicePayment, Payment
from apps.payment.serializers.payment.payment import PaymentSerializer
from apps.master.utils.text_choices import PaymentStatus, InvoicePaymentStatus
from apps.invoice.models import Invoice

logger = logging.getLogger(__name__)


class SyncInvoicePaymentStatusSerializer(BaseSerializer):
    # Manually sync/verify Stripe payment status for an invoice.
    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        source="invoice",
        write_only=True
    )
    status = serializers.CharField(read_only=True)
    detail = serializers.CharField(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = InvoicePayment
        fields = BaseSerializer.Meta.fields + ["invoice_id", "status", "detail"]
    def validate_invoice_id(self, value):
        # Prevent syncing an invoice that's already marked paid
        if getattr(value, "payment_status", None) == InvoicePaymentStatus.PAID:
            raise serializers.ValidationError("Invoice is already marked as paid.")
        return value
    def _get_pending_invoice_payment(self, invoice):
        return InvoicePayment.objects.filter(
            invoice=invoice,
            payment__status=PaymentStatus.PENDING,
            payment__gateway_detail__checkout_session_id__isnull=False
        ).select_related("payment__gateway_detail", "payment").order_by("-payment__created_at").first()

    def _retrieve_stripe_session(self, checkout_session_id):
        try:
            return stripe.checkout.Session.retrieve(checkout_session_id)
        except Exception as exc:
            logger.exception("Failed to retrieve Stripe session: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})

    def _mark_payment_and_invoice_paid(self, inv_payment):
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(id=inv_payment.invoice.id)
            if invoice.payment_status != InvoicePaymentStatus.PAID:
                payment = inv_payment.payment
                payment_payload = {"status": PaymentStatus.SUCCEEDED, "paid_at": timezone.now()}
                ps = PaymentSerializer(instance=payment, data=payment_payload, partial=True, context=self.context)
                ps.is_valid(raise_exception=True)
                ps.save()

                invoice.payment_status = InvoicePaymentStatus.PAID
                invoice.save(update_fields=["payment_status"])

    def create(self, validated_data):
        invoice = validated_data["invoice"]

        inv_payment = self._get_pending_invoice_payment(invoice)
        if not inv_payment or not getattr(inv_payment.payment.gateway_detail, "checkout_session_id", None):
            return {"status": "UNPAID", "detail": "No pending online payment found for this invoice."}

        session = self._retrieve_stripe_session(inv_payment.payment.gateway_detail.checkout_session_id)

        if getattr(session, "payment_status", None) == "paid":
            self._mark_payment_and_invoice_paid(inv_payment)
            return {"status": "PAID", "detail": "Payment verified and updated successfully!"}

        return {"status": "UNPAID", "detail": "Payment is not completed yet."}

