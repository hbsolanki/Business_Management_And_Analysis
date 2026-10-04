from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.conf import settings
import logging

from apps.payment.models import StripeConnectAccount
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentType, PaymentStatus, InvoicePaymentStatus,
    StripeAccountStatus, PaymentGateway
)
from apps.invoice.models import Invoice
from apps.payment.serializers.invoice_payment.invoice_payment import InvoicePaymentSerializer
from apps.payment.serializers.payment.payment import PaymentSerializer
from apps.payment.serializers.payment.payment_gateway import PaymentGatewaySerializer
from apps.payment.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

class InitiateInvoicePaymentSerializer(serializers.Serializer):
    # Used when a customer clicks "Pay Now" on an invoice.
    # Backend will create a Stripe Checkout Session and return the payment link.
    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        source="invoice",
        write_only=True,
    )
    method = serializers.ChoiceField(
        choices=PaymentMethod.choices,
        default=PaymentMethod.CARD,
        write_only=True,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    success_url = serializers.URLField(required=True, write_only=True)
    cancel_url = serializers.URLField(required=True, write_only=True)
    checkout_url = serializers.URLField(read_only=True)
    payment_id = serializers.IntegerField(read_only=True)

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

    def create(self, validated_data):
        request = self.context.get("request")
        invoice = validated_data["invoice"]
        
        # Verify Stripe Connect Account configuration
        connect_account = StripeConnectAccount.objects.filter(
            business=request.user.business, status=StripeAccountStatus.ACTIVE
        ).first()

        if not connect_account or not connect_account.charges_enabled:
            raise serializers.ValidationError({
                "stripe_connect": "Please set up and verify online card payments first in your dashboard."
            })

        PLATFORM_FEE_PERCENT = Decimal(str(getattr(settings, "STRIPE_PLATFORM_FEE_PERCENT", "0.75")))
        fee_in_cents = int(invoice.total_amount * PLATFORM_FEE_PERCENT)
        amount_in_cents = int(invoice.total_amount * 100)

        success_url = validated_data["success_url"]
        cancel_url = validated_data["cancel_url"]

        try:
            # Create Stripe Checkout Session
            session = StripeService.create_invoice_checkout_session(
                invoice_id=invoice.id,
                amount_in_cents=amount_in_cents,
                currency="inr",
                connected_account_id=connect_account.stripe_account_id,
                platform_fee_in_cents=fee_in_cents,
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=invoice.customer.email if invoice.customer else None,
            )

            with transaction.atomic():
                payment_serializer = PaymentSerializer(data={
                    "business_id": request.user.business.id,
                    "payment_type": PaymentType.INVOICE,
                    "method": validated_data["method"],
                    "status": PaymentStatus.PENDING,
                    "amount": invoice.total_amount,
                    "currency": "INR",
                    "notes": validated_data.get("notes", ""),
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
                    "stripe_connected_account_id": connect_account.stripe_account_id,
                    "checkout_session_id": session.id,
                    "payment_link": session.url,
                    "platform_fee": Decimal(fee_in_cents) / 100,
                    "payment_link_expires_at": timezone.now() + timezone.timedelta(hours=24),
                })
                gateway_serializer.is_valid(raise_exception=True)
                gateway_serializer.save()

            return {
                "checkout_url": session.url,
                "payment_id": payment.id
            }

        except Exception as exc:
            logger.exception("Failed to create invoice Checkout Session: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})
