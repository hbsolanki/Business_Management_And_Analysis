from rest_framework import serializers
import logging
from django.utils import timezone
from decimal import Decimal

from apps.payment.models import StripeConnectAccount, PaymentGatewayDetail, WebhookEvent
from apps.master.utils.text_choices import StripeAccountStatus, PaymentStatus, PaymentType
from apps.base.serializers.base import BaseSerializer

logger = logging.getLogger(__name__)


class WebhookEventSerializer(BaseSerializer):
    payment = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = WebhookEvent
        fields = BaseSerializer.Meta.fields + [
            "stripe_event_id",
            "event_type",
            "payment_type",
            "payment",
            "raw_payload",
            "is_processed",
            "processed_at",
            "error_message",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "stripe_event_id",
            "event_type",
            "payment_type",
            "payment",
            "raw_payload",
            "is_processed",
            "processed_at",
            "error_message",
        ]


class WebhookEventUpsertSerializer(serializers.Serializer):
    stripe_event_id = serializers.CharField()
    event_type = serializers.CharField()
    payment_type = serializers.ChoiceField(
        choices=PaymentType.choices,
        required=False,
        allow_null=True,
    )
    should_process = True
    _existing_event = None

    def validate(self, attrs):
        event = WebhookEvent.objects.filter(stripe_event_id=attrs["stripe_event_id"]).first()
        self._existing_event = event

        if event:
            if event.event_type != attrs["event_type"]:
                raise serializers.ValidationError({
                    "event_type": "Stripe event id reused with a different event type.",
                })

            payment_type = attrs.get("payment_type")
            if payment_type and event.payment_type and event.payment_type != payment_type:
                raise serializers.ValidationError({
                    "payment_type": "Stripe event id reused with a different payment type.",
                })

            self.should_process = not event.is_processed

        return attrs

    def create(self, validated_data):
        event = self._existing_event

        if event is None:
            event, created = WebhookEvent.objects.get_or_create(
                stripe_event_id=validated_data["stripe_event_id"],
                defaults={
                    "event_type": validated_data["event_type"],
                    "payment_type": validated_data.get("payment_type"),
                },
            )
            self.should_process = not event.is_processed
            if not created and event.is_processed:
                self.should_process = False
        else:
            self.should_process = not event.is_processed

        return event

    def update(self, instance, validated_data):
        self.should_process = not instance.is_processed
        return instance


class StripeWebhookSerializer(serializers.Serializer):
    """
    Serializer to process verified Stripe webhook events.
    Isolates all validation and model update operations away from views.
    """
    id = serializers.CharField()
    type = serializers.CharField()
    data = serializers.DictField()

    def validate(self, attrs):
        # Base validation structure for Stripe Event dictionary
        if not attrs.get("id") or not attrs.get("type"):
            raise serializers.ValidationError("Stripe event is missing key attributes (id/type).")
        if "object" not in attrs.get("data", {}):
            raise serializers.ValidationError("Stripe event is missing data object payload.")
        return attrs

    def save(self, **kwargs):
        from apps.payment.services.invoice_payment_service import InvoicePaymentService
        from apps.payment.services.subscription_payment_service import SubscriptionPaymentService

        event_id = self.validated_data["id"]
        event_type = self.validated_data["type"]
        obj = self.validated_data["data"]["object"]

        # Stripe Connect
        if event_type == "account.updated":
            self._handle_account_updated(obj)

        # Checkout Session
        elif event_type == "checkout.session.completed":
            metadata = obj.get("metadata", {})
            payment_type = metadata.get("type")
            payment_intent_id = obj.get("payment_intent")

            if payment_type == "INVOICE":
                InvoicePaymentService.handle_success(
                    metadata=metadata,
                    transaction_id=payment_intent_id,
                )
            elif payment_type == "SUBSCRIPTION":
                SubscriptionPaymentService.handle_success(
                    metadata=metadata,
                    transaction_id=payment_intent_id,
                    event_id=event_id,
                    event_type=event_type,
                    payment_type=payment_type,
                )

        # PaymentIntent Success
        elif event_type == "payment_intent.succeeded":
            metadata = obj.get("metadata", {})
            payment_type = metadata.get("type")
            transaction_id = obj.get("id")

            if payment_type == "INVOICE":
                InvoicePaymentService.handle_success(metadata, transaction_id)
            elif payment_type == "SUBSCRIPTION":
                SubscriptionPaymentService.handle_success(
                    metadata, transaction_id,
                    event_id=event_id, event_type=event_type, payment_type=payment_type,
                )

        # Payment Failure
        elif event_type in ["payment_intent.payment_failed", "payment_intent.canceled"]:
            metadata = obj.get("metadata", {})
            payment_type = metadata.get("type")
            transaction_id = obj.get("id")

            if payment_type == "INVOICE":
                InvoicePaymentService.handle_failure(metadata, transaction_id=transaction_id)
            elif payment_type == "SUBSCRIPTION":
                SubscriptionPaymentService.handle_failure(
                    metadata, transaction_id=transaction_id,
                    event_id=event_id, event_type=event_type, payment_type=payment_type,
                )

        # Refund confirmed
        elif event_type == "charge.refunded":
            self._handle_charge_refunded(obj)

        return self.validated_data

    def _handle_account_updated(self, stripe_account):
        stripe_account_id = stripe_account.get("id")
        if not stripe_account_id:
            return

        try:
            connect = StripeConnectAccount.objects.get(stripe_account_id=stripe_account_id)
        except StripeConnectAccount.DoesNotExist:
            logger.warning("account.updated received for unknown account: %s", stripe_account_id)
            return

        connect.charges_enabled = stripe_account.get("charges_enabled", False)
        connect.payouts_enabled = stripe_account.get("payouts_enabled", False)
        connect.details_submitted = stripe_account.get("details_submitted", False)

        if connect.charges_enabled and connect.status != StripeAccountStatus.ACTIVE:
            connect.status = StripeAccountStatus.ACTIVE
            connect.onboarded_at = timezone.now()
            logger.info("Stripe Connect account %s is now ACTIVE", stripe_account_id)
        elif not connect.charges_enabled:
            connect.status = StripeAccountStatus.RESTRICTED

        connect.save(update_fields=[
            "charges_enabled", "payouts_enabled", "details_submitted", "status", "onboarded_at"
        ])

    def _handle_charge_refunded(self, charge_obj):
        charge_id = charge_obj.get("id")
        amount_refunded = charge_obj.get("amount_refunded", 0)

        try:
            gateway = PaymentGatewayDetail.objects.select_related("payment").get(
                stripe_charge_id=charge_id
            )
        except PaymentGatewayDetail.DoesNotExist:
            return

        payment = gateway.payment
        payment.refunded_amount = Decimal(amount_refunded) / 100
        is_full = payment.refunded_amount >= payment.amount
        payment.status = PaymentStatus.REFUNDED if is_full else PaymentStatus.PARTIALLY_REFUNDED
        payment.refunded_at = timezone.now()
        payment.save(update_fields=["refunded_amount", "status", "refunded_at"])
