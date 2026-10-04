from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
import logging

from apps.base.serializers.base import BaseSerializer
from apps.payment.models import Payment
from apps.payment.serializers.payment.payment import PaymentSerializer
from apps.master.utils.text_choices import PaymentStatus
from apps.payment.services.stripe_service import StripeService

logger = logging.getLogger(__name__)


class RefundPaymentSerializer(BaseSerializer):
    # Used to initiate a full or partial refund.
    payment_id = serializers.PrimaryKeyRelatedField(
        queryset=Payment.objects.all(),
        source="payment",
        write_only=True,
        required=True,
    )
    payment = PaymentSerializer(read_only=True)

    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False,
        help_text="Leave blank for full refund."
    )
    reason = serializers.CharField(required=False, allow_blank=True)

    class Meta(BaseSerializer.Meta):
        model = Payment
        fields = BaseSerializer.Meta.fields + ["payment", "payment_id", "amount", "reason"]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["payment"]

    def validate_payment_id(self, value):
        # Ensure payment belongs to the requesting business and is succeeded
        request = self.context.get("request")
        if request and getattr(request, "user", None):
            business = getattr(request.user, "business", None)
            if business and value.business_id != business.id:
                raise serializers.ValidationError("Payment does not belong to your business.")

        if value.status != PaymentStatus.SUCCEEDED:
            raise serializers.ValidationError("Only succeeded payments can be refunded.")

        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)

        payment = attrs.get("payment")
        refund_amount = attrs.get("amount") or payment.amount

        if refund_amount <= 0:
            raise serializers.ValidationError({"amount": "Refund amount must be greater than zero."})

        refundable_balance = payment.amount - payment.refunded_amount
        if refund_amount > refundable_balance:
            raise serializers.ValidationError({"amount": f"Refund amount exceeds the refundable balance of {refundable_balance}."})

        attrs["refund_amount"] = refund_amount
        return attrs

    def create(self, validated_data):
        payment = validated_data["payment"]
        refund_amount = validated_data["refund_amount"]

        # Call Stripe API
        try:
            gateway = getattr(payment, "gateway_detail", None)
            if gateway and getattr(gateway, "stripe_charge_id", None):
                is_connect = bool(getattr(gateway, "stripe_connected_account_id", None))
                StripeService.create_refund(
                    charge_id=gateway.stripe_charge_id,
                    amount_in_cents=int(refund_amount * 100),
                    reason=validated_data.get("reason", "requested_by_customer"),
                    reverse_transfer=is_connect,
                    refund_application_fee=is_connect,
                )
        except Exception as exc:
            logger.exception("Stripe refund failed: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})

        # Save to database
        with transaction.atomic():
            payment.refunded_amount += refund_amount
            is_full = payment.refunded_amount >= payment.amount
            payment.status = PaymentStatus.REFUNDED if is_full else PaymentStatus.PARTIALLY_REFUNDED
            payment.refunded_at = timezone.now()
            payment.save(update_fields=["refunded_amount", "status", "refunded_at"])

        return payment