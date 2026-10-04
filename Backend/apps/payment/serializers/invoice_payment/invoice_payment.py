from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.invoice.models import Invoice
from apps.invoice.serializers.invoice import InvoiceSerializer
from apps.payment.models import InvoicePayment, Payment
from apps.payment.serializers.payment.payment import PaymentSerializer

class InvoicePaymentSerializer(BaseSerializer):
    payment_id = serializers.PrimaryKeyRelatedField(
        queryset=Payment.objects.all(),
        source="payment",
        write_only=True,
        required=False,
    )
    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        source="invoice",
        write_only=True,
        required=False,
    )

    payment = PaymentSerializer(read_only=True)
    invoice = InvoiceSerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = InvoicePayment
        fields = BaseSerializer.Meta.fields + ["invoice", "payment", "invoice_id", "payment_id"]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["invoice", "payment"]

    def validate(self, attrs):
        attrs = super().validate(attrs)

        payment = attrs.get("payment")
        invoice = attrs.get("invoice")

        if self.instance is None:
            if payment is None:
                raise serializers.ValidationError({"payment_id": "This field is required."})
            if invoice is None:
                raise serializers.ValidationError({"invoice_id": "This field is required."})

        if payment and getattr(payment, "invoice_payment", None):
            if self.instance is None or payment.invoice_payment.pk != self.instance.pk:
                raise serializers.ValidationError({"payment_id": "This payment is already linked to an invoice payment."})

        return attrs

