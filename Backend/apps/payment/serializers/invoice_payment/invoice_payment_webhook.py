from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import serializers

from apps.invoice.models import Invoice
from apps.master.utils.text_choices import (
    PaymentGateway,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    InvoicePaymentStatus,
)
from apps.payment.models import Payment
from apps.payment.serializers.invoice_payment.invoice_payment import InvoicePaymentSerializer
from apps.payment.serializers.payment.payment import PaymentSerializer
from apps.payment.serializers.payment.payment_gateway import PaymentGatewaySerializer


class WebhookInvoicePaymentSerializer(serializers.Serializer):
    """
    Standard DRF Serializer to validate, process, and record invoice payments
    received from verified Stripe webhook events.
    """
    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        source="invoice",
        write_only=True,
    )
    status = serializers.ChoiceField(choices=[PaymentStatus.SUCCEEDED, PaymentStatus.FAILED])
    transaction_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    connected_account_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    failure_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    method = serializers.ChoiceField(
        choices=[m.value for m in PaymentMethod],
        default=PaymentMethod.CARD,
    )

    def create(self, validated_data):
        invoice = validated_data["invoice"]
        status_val = validated_data["status"]
        transaction_id = validated_data.get("transaction_id")
        connected_account_id = validated_data.get("connected_account_id")
        failure_reason = validated_data.get("failure_reason", "")
        method = validated_data.get("method", PaymentMethod.CARD)

        with db_transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(id=invoice.id)

            if status_val == PaymentStatus.SUCCEEDED:
                if invoice.payment_status == InvoicePaymentStatus.PAID:
                    existing_payment = Payment.objects.filter(
                        invoice_payment__invoice=invoice,
                        status=PaymentStatus.SUCCEEDED
                    ).first()
                    if existing_payment:
                        return existing_payment
                    # fallback if invoice status is PAID but payment not found in db
                    payment_serializer = PaymentSerializer(data={
                        "business_id": invoice.business.id,
                        "payment_type": PaymentType.INVOICE,
                        "method": method,
                        "status": PaymentStatus.SUCCEEDED,
                        "amount": invoice.total_amount,
                        "currency": "INR",
                        "paid_at": timezone.now(),
                    })
                    payment_serializer.is_valid(raise_exception=True)
                    payment = payment_serializer.save()

                else:
                    payment_serializer = PaymentSerializer(data={
                        "business_id": invoice.business.id,
                        "payment_type": PaymentType.INVOICE,
                        "method": method,
                        "status": PaymentStatus.SUCCEEDED,
                        "amount": invoice.total_amount,
                        "currency": "INR",
                        "paid_at": timezone.now(),
                    })
                    payment_serializer.is_valid(raise_exception=True)
                    payment = payment_serializer.save()

                link_serializer = InvoicePaymentSerializer(data={
                    "payment_id": payment.id,
                    "invoice_id": invoice.id,
                })
                link_serializer.is_valid(raise_exception=True)
                link_serializer.save()

                gateway_serializer = PaymentGatewaySerializer(data={
                    "payment_id": payment.id,
                    "gateway": PaymentGateway.STRIPE,
                    "stripe_payment_intent_id": str(transaction_id) if transaction_id else "",
                    "stripe_connected_account_id": connected_account_id or "",
                })
                gateway_serializer.is_valid(raise_exception=True)
                gateway_serializer.save()

                invoice.payment_status = InvoicePaymentStatus.PAID
                invoice.save(update_fields=["payment_status"])
            else:
                payment_serializer = PaymentSerializer(data={
                    "business_id": invoice.business.id,
                    "payment_type": PaymentType.INVOICE,
                    "method": method,
                    "status": PaymentStatus.FAILED,
                    "amount": invoice.total_amount,
                    "currency": "INR",
                    "failed_at": timezone.now(),
                    "failure_reason": failure_reason,
                })
                payment_serializer.is_valid(raise_exception=True)
                payment = payment_serializer.save()

                link_serializer = InvoicePaymentSerializer(data={
                    "payment_id": payment.id,
                    "invoice_id": invoice.id,
                })
                link_serializer.is_valid(raise_exception=True)
                link_serializer.save()

                if transaction_id:
                    gateway_serializer = PaymentGatewaySerializer(data={
                        "payment_id": payment.id,
                        "gateway": PaymentGateway.STRIPE,
                        "stripe_payment_intent_id": str(transaction_id),
                    })
                    gateway_serializer.is_valid(raise_exception=True)
                    gateway_serializer.save()

            return payment