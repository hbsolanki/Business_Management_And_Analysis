from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.master.utils.text_choices import PaymentGateway, PaymentMethod, PaymentStatus, PaymentType
from apps.payment.models import Payment
from apps.payment.serializers.payment.payment import PaymentSerializer
from apps.payment.serializers.payment.payment_gateway import PaymentGatewaySerializer
from apps.payment.serializers.subscription_payment.subscription_payment import SubscriptionPaymentSerializer
from apps.payment.serializers.stripe.stripe_webhook import WebhookEventUpsertSerializer
from apps.subscription.models import Subscription


class SubscriptionPaymentSuccessSerializer(serializers.Serializer):
    metadata = serializers.DictField()
    transaction_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        subscription = self.instance
        if subscription is None:
            raise serializers.ValidationError("Subscription instance is required.")

        metadata_business_id = attrs["metadata"].get("business_id")
        if metadata_business_id is not None and str(subscription.business_id) != str(metadata_business_id):
            raise serializers.ValidationError({"metadata": "Metadata business does not match subscription business."})

        return attrs

    def create(self, validated_data):
        return self.update(self.instance, validated_data)

    def update(self, instance, validated_data):
        metadata = validated_data["metadata"]
        transaction_id = validated_data.get("transaction_id")
        event = validated_data.get("event")
        event_type = validated_data.get("event_type", "payment_intent.succeeded")
        payment_type = validated_data.get("payment_type", PaymentType.SUBSCRIPTION)

        event_serializer = None
        if event is None and validated_data.get("event_id"):
            event_serializer = WebhookEventUpsertSerializer(data={
                "stripe_event_id": validated_data["event_id"],
                "event_type": event_type,
                "payment_type": payment_type,
            })
            event_serializer.is_valid(raise_exception=True)
            event = event_serializer.save()
            if not event_serializer.should_process:
                return instance

        with transaction.atomic():
            subscription = (
                Subscription.objects.select_for_update()
                .select_related("business")
                .get(pk=instance.pk)
            )

            self._validate_metadata(subscription, metadata)

            if transaction_id and Payment.objects.filter(
                subscription_payment__subscription=subscription,
                status=PaymentStatus.SUCCEEDED,
                gateway_detail__stripe_payment_intent_id=str(transaction_id),
            ).exists():
                if event:
                    self._complete_event(event)
                return subscription

            now = timezone.now()
            active_subscription = (
                Subscription.objects.select_for_update()
                .filter(business=subscription.business, is_active=True)
                .exclude(pk=subscription.pk)
                .first()
            )

            if active_subscription:
                if subscription.plan_id == active_subscription.plan_id:
                    active_subscription.end_date += timedelta(days=subscription.duration_days)
                    if subscription.max_products is not None and active_subscription.max_products is not None:
                        active_subscription.max_products += subscription.max_products
                    if subscription.max_invoices is not None and active_subscription.max_invoices is not None:
                        active_subscription.max_invoices += subscription.max_invoices
                    if subscription.max_staff is not None and active_subscription.max_staff is not None:
                        active_subscription.max_staff += subscription.max_staff
                    active_subscription.save(update_fields=["end_date", "max_products", "max_invoices", "max_staff"])

                    subscription.is_active = False
                    subscription.status = Subscription.SubscriptionStatus.SUPERSEDED

                elif (subscription.price or 0) >= (active_subscription.price or 0):
                    active_subscription.is_active = False
                    active_subscription.status = Subscription.SubscriptionStatus.SUPERSEDED
                    active_subscription.cancelled_at = now
                    active_subscription.save(update_fields=["is_active", "status", "cancelled_at"])

                    subscription.is_active = True
                    subscription.status = Subscription.SubscriptionStatus.ACTIVE
                    subscription.start_date = now
                    subscription.end_date = now + timedelta(days=subscription.duration_days)
                else:
                    # Downgrade: new plan is cheaper — schedule it to start after current expires
                    subscription.is_active = False
                    subscription.status = Subscription.SubscriptionStatus.PENDING_PAYMENT
                    subscription.start_date = active_subscription.end_date
                    subscription.end_date = active_subscription.end_date + timedelta(days=subscription.duration_days)
            else:
                # No existing active subscription — activate immediately
                # Reset start_date to now if it was set in the past (e.g. subscription created earlier)
                subscription.start_date = now
                subscription.end_date = now + timedelta(days=subscription.duration_days)
                subscription.is_active = True
                subscription.status = Subscription.SubscriptionStatus.ACTIVE

            subscription.cancelled_at = None
            subscription.expired_at = None
            subscription.failed_at = None
            subscription.save(update_fields=[
                "is_active",
                "status",
                "start_date",
                "end_date",
                "cancelled_at",
                "expired_at",
                "failed_at",
            ])

            payment = self._create_payment_record(
                subscription=subscription,
                transaction_id=transaction_id,
                status=PaymentStatus.SUCCEEDED,
            )

            if event:
                event.payment = payment
                event.save(update_fields=["payment"])
                self._complete_event(event)

            return subscription

    @staticmethod
    def _validate_metadata(subscription, metadata):
        metadata_business_id = metadata.get("business_id")
        if metadata_business_id is None:
            return

        if str(subscription.business_id) != str(metadata_business_id):
            raise serializers.ValidationError({"metadata": "Metadata business does not match subscription business."})

    @staticmethod
    def _complete_event(event):
        if not event:
            return
        event.is_processed = True
        event.processed_at = timezone.now()
        event.error_message = None
        event.save(update_fields=["is_processed", "processed_at", "error_message", "updated_at"])

    @staticmethod
    def _create_payment_record(subscription, transaction_id, status):
        payment_serializer = PaymentSerializer(data={
            "business_id": subscription.business.id,
            "payment_type": PaymentType.SUBSCRIPTION,
            "method": PaymentMethod.CARD,
            "status": status,
            "amount": subscription.price or 0,
            "currency": "INR",
            "paid_at": timezone.now() if status == PaymentStatus.SUCCEEDED else None,
            "failed_at": timezone.now() if status == PaymentStatus.FAILED else None,
        })
        payment_serializer.is_valid(raise_exception=True)
        payment = payment_serializer.save()

        sub_payment_serializer = SubscriptionPaymentSerializer(data={
            "payment_id": payment.id,
            "subscription_id": subscription.id,
        })
        sub_payment_serializer.is_valid(raise_exception=True)
        sub_payment_serializer.save()

        if transaction_id:
            gateway_serializer = PaymentGatewaySerializer(data={
                "payment_id": payment.id,
                "gateway": PaymentGateway.STRIPE,
                "stripe_payment_intent_id": str(transaction_id),
            })
            gateway_serializer.is_valid(raise_exception=True)
            gateway_serializer.save()

        return payment


class SubscriptionPaymentFailureSerializer(serializers.Serializer):
    metadata = serializers.DictField()
    transaction_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        subscription = self.instance
        if subscription is None:
            raise serializers.ValidationError("Subscription instance is required.")

        metadata_business_id = attrs["metadata"].get("business_id")
        if metadata_business_id is not None and str(subscription.business_id) != str(metadata_business_id):
            raise serializers.ValidationError({"metadata": "Metadata business does not match subscription business."})

        return attrs

    def create(self, validated_data):
        return self.update(self.instance, validated_data)

    def update(self, instance, validated_data):
        metadata = validated_data["metadata"]
        transaction_id = validated_data.get("transaction_id")
        event = validated_data.get("event")
        event_type = validated_data.get("event_type", "payment_intent.payment_failed")
        payment_type = validated_data.get("payment_type", PaymentType.SUBSCRIPTION)

        if event is None and validated_data.get("event_id"):
            event_serializer = WebhookEventUpsertSerializer(data={
                "stripe_event_id": validated_data["event_id"],
                "event_type": event_type,
                "payment_type": payment_type,
            })
            event_serializer.is_valid(raise_exception=True)
            event = event_serializer.save()
            if not event_serializer.should_process:
                return instance

        with transaction.atomic():
            subscription = (
                Subscription.objects.select_for_update()
                .select_related("business")
                .get(pk=instance.pk)
            )

            self._validate_metadata(subscription, metadata)

            if subscription.is_active:
                if event:
                    self._complete_event(event)
                return subscription

            subscription.is_active = False
            subscription.status = Subscription.SubscriptionStatus.FAILED
            subscription.failed_at = timezone.now()
            subscription.save(update_fields=["is_active", "status", "failed_at"])

            payment = self._create_payment_record(
                subscription=subscription,
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
            )

            if event:
                event.payment = payment
                event.save(update_fields=["payment"])
                self._complete_event(event)

            return subscription

    @staticmethod
    def _validate_metadata(subscription, metadata):
        metadata_business_id = metadata.get("business_id")
        if metadata_business_id is None:
            return

        if str(subscription.business_id) != str(metadata_business_id):
            raise serializers.ValidationError({"metadata": "Metadata business does not match subscription business."})

    @staticmethod
    def _complete_event(event):
        if not event:
            return
        event.is_processed = True
        event.processed_at = timezone.now()
        event.error_message = None
        event.save(update_fields=["is_processed", "processed_at", "error_message", "updated_at"])

    @staticmethod
    def _create_payment_record(subscription, transaction_id, status):
        payment_serializer = PaymentSerializer(data={
            "business_id": subscription.business.id,
            "payment_type": PaymentType.SUBSCRIPTION,
            "method": PaymentMethod.CARD,
            "status": status,
            "amount": subscription.price or 0,
            "currency": "INR",
            "paid_at": timezone.now() if status == PaymentStatus.SUCCEEDED else None,
            "failed_at": timezone.now() if status == PaymentStatus.FAILED else None,
        })
        payment_serializer.is_valid(raise_exception=True)
        payment = payment_serializer.save()

        sub_payment_serializer = SubscriptionPaymentSerializer(data={
            "payment_id": payment.id,
            "subscription_id": subscription.id,
        })
        sub_payment_serializer.is_valid(raise_exception=True)
        sub_payment_serializer.save()

        if transaction_id:
            gateway_serializer = PaymentGatewaySerializer(data={
                "payment_id": payment.id,
                "gateway": PaymentGateway.STRIPE,
                "stripe_payment_intent_id": str(transaction_id),
            })
            gateway_serializer.is_valid(raise_exception=True)
            gateway_serializer.save()

        return payment