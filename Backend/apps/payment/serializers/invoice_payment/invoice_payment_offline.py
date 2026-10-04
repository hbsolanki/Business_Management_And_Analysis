from rest_framework import serializers
from django.utils import timezone
from django.db import transaction

from apps.payment.models import Payment, StripeConnectAccount, InvoicePayment
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentType, PaymentStatus, InvoicePaymentStatus,
    StripeAccountStatus, OfflinePaymentMethod
)
from apps.invoice.models import Invoice
from apps.base.serializers.base import BaseSerializer
from apps.payment.serializers.payment.payment import PaymentSerializer

class OfflineInvoicePaymentSerializer(BaseSerializer):
    # Used to record a manual/offline payment (CASH, CHEQUE, NEFT, RTGS, IMPS, UPI).
    # No Stripe involved.
    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        source="invoice",
        write_only=True
    )
    method = serializers.ChoiceField(
        choices=OfflinePaymentMethod.choices,
    )

    class Meta(BaseSerializer.Meta):
        model = Payment
        fields = BaseSerializer.Meta.fields + ["invoice_id", "method", "amount", "reference_number", "notes"]

    def validate_invoice_id(self, value):
        request = self.context.get("request")
        if request and request.user:
            from apps.master.utils.text_choices import UserRole
            if value.business != request.user.business:
                raise serializers.ValidationError("Invoice not found or does not belong to your business.")
            if request.user.role_name == UserRole.MANAGER:
                if not request.user.branches.filter(id=value.branch_id).exists():
                    raise serializers.ValidationError("Invoice belongs to a branch you are not assigned to.")
            elif request.user.role_name == UserRole.EMPLOYEE:
                if not request.user.assigned_branches.filter(branch_id=value.branch_id).exists():
                    raise serializers.ValidationError("Invoice belongs to a branch you are not assigned to.")

        if value.payment_status == InvoicePaymentStatus.PAID:
            raise serializers.ValidationError("Invoice is already fully paid.")
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError({"amount": "Amount must be greater than zero."})
        invoice_id = self.initial_data.get("invoice_id")
        if invoice_id:
            try:
                invoice = Invoice.objects.get(pk=invoice_id)
            except Invoice.DoesNotExist:
                return value

            if value > invoice.balance_due:
                raise serializers.ValidationError({"amount": f"Amount exceeds the remaining balance due of {invoice.balance_due}."})

        return value

    def validate_method(self, value):
        # If method is UPI, check if active Stripe Connect with charges enabled is configured
        if value == PaymentMethod.UPI:
            request = self.context.get("request")
            connect_account = StripeConnectAccount.objects.filter(
                business=request.user.business, status=StripeAccountStatus.ACTIVE
            ).first()
            if connect_account and connect_account.charges_enabled:
                raise serializers.ValidationError(
                    "Stripe Connect is active. UPI payments should be processed online using the 'Pay Now' option."
                )
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        invoice = validated_data["invoice"]

        with transaction.atomic():
            payment_serializer = PaymentSerializer(data={
                "business_id": request.user.business.id,
                "payment_type": PaymentType.INVOICE,
                "method": validated_data["method"],
                "status": PaymentStatus.SUCCEEDED,
                "amount": validated_data["amount"],
                "currency": "INR",
                "reference_number": validated_data.get("reference_number", ""),
                "notes": validated_data.get("notes", ""),
                "paid_at": timezone.now(),
            })
            payment_serializer.is_valid(raise_exception=True)
            payment = payment_serializer.save()

            # 2. Link payment to invoice
            InvoicePayment.objects.create(payment=payment, invoice=invoice)

            # 3. Update the invoice payment status
            invoice.refresh_from_db()
            total_paid = invoice.paid_amount
            if total_paid >= invoice.total_amount:
                invoice.payment_status = InvoicePaymentStatus.PAID
            else:
                invoice.payment_status = InvoicePaymentStatus.PARTIALLY_PAID
            invoice.save(update_fields=["payment_status"])

        return payment
