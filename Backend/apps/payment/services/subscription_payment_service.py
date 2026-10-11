from django.utils import timezone
from django.db import transaction

from apps.subscription.models import Subscription, Usage
from apps.subscription.tasks import send_subscription_email
from apps.notification.utils import send_notification
from apps.notification.models import Notification
from apps.user.models import User
from apps.payment.models import WebhookEvent
from apps.master.utils.text_choices import PaymentType, PaymentMethod, PaymentStatus, PaymentGateway
from apps.payment.serializers import (
    PaymentSerializer,
    SubscriptionPaymentSerializer,
    PaymentGatewaySerializer,
    WebhookEventUpsertSerializer,
    SubscriptionPaymentSuccessSerializer,
    SubscriptionPaymentFailureSerializer,
)


class SubscriptionPaymentService:

    @staticmethod
    def _validate_metadata(subscription, metadata):
        """Ensure the webhook metadata belongs to the same business as the subscription."""
        business_id_from_metadata = metadata.get("business_id")

        # Some webhook payloads may not include business_id, so skip validation in that case.
        if business_id_from_metadata is None:
            return

        subscription_business_id = str(subscription.business_id)
        metadata_business_id = str(business_id_from_metadata)

        if subscription_business_id != metadata_business_id:
            raise ValueError("Metadata business does not match subscription business")

    @staticmethod
    def _init_event(event_id, event_type, payment_type, subscription_id):
        """Create or validate an idempotent webhook event record."""
        if not event_id:
            return None, True

        event_serializer = WebhookEventUpsertSerializer(data={
            "stripe_event_id": event_id,
            "event_type": event_type,
            "payment_type": payment_type,
        })
        event_serializer.is_valid(raise_exception=True)
        event = event_serializer.save()

        return event, event_serializer.should_process

    @staticmethod
    def _complete_event(event):
        if not event:
            return
        event.is_processed = True
        event.processed_at = timezone.now()
        event.error_message = None
        event.save(update_fields=["is_processed", "processed_at", "error_message", "updated_at"])

    @staticmethod
    def _fail_event(event, error_message):
        if not event:
            return
        event.error_message = error_message
        event.save(update_fields=["error_message", "updated_at"])

    @staticmethod
    def _create_payment_record(subscription, transaction_id, status):
        """
        Creates Payment + SubscriptionPayment + PaymentGatewayDetail.
        """
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

    @staticmethod
    def handle_success(
        metadata,
        transaction_id,
        event_id=None,
        event_type="payment_intent.succeeded",
        payment_type="SUBSCRIPTION",
    ):
        subscription_id = metadata.get("subscription_id")
        user_id = metadata.get("user_id")
        if not subscription_id:
            return

        try:
            with transaction.atomic():
                event, should_process = SubscriptionPaymentService._init_event(
                    event_id=event_id,
                    event_type=event_type,
                    payment_type=payment_type,
                    subscription_id=subscription_id,
                )
                if not should_process:
                    return

                subscription = (
                    Subscription.objects.select_for_update()
                    .select_related("business")
                    .get(id=subscription_id)
                )
                subscription_serializer = SubscriptionPaymentSuccessSerializer(
                    instance=subscription,
                    data={
                        "metadata": metadata,
                        "transaction_id": transaction_id,
                    },
                )
                subscription_serializer.is_valid(raise_exception=True)
                subscription = subscription_serializer.save(
                    event=event,
                    event_type=event_type,
                    payment_type=payment_type,
                )

                if user_id:
                    recipient = User.objects.filter(id=user_id, is_active=True).first()
                    if recipient:
                        send_notification(
                            user=recipient,
                            title="Subscription purchased",
                            content=f"Your purchase of the {subscription.plan_name} plan was successful!",
                            action_type=Notification.ActionType.SUBSCRIPTION_PURCHASED,
                            action_link="/subscription/plan/purchased/",
                        )
                    send_subscription_email.delay(
                        subscription_id=int(subscription.id), user_id=int(user_id)
                    )

        except Subscription.DoesNotExist:
            if event_id:
                event = WebhookEvent.objects.filter(stripe_event_id=event_id).first()
                SubscriptionPaymentService._fail_event(event, "Subscription does not exist")
            return
        except Exception as exc:
            if event_id:
                event = WebhookEvent.objects.filter(stripe_event_id=event_id).first()
                SubscriptionPaymentService._fail_event(event, str(exc))
            raise

    @staticmethod
    def handle_failure(
        metadata,
        transaction_id=None,
        event_id=None,
        event_type="payment_intent.payment_failed",
        payment_type="SUBSCRIPTION",
    ):
        subscription_id = metadata.get("subscription_id")
        if not subscription_id:
            return

        try:
            with transaction.atomic():
                event, should_process = SubscriptionPaymentService._init_event(
                    event_id=event_id,
                    event_type=event_type,
                    payment_type=payment_type,
                    subscription_id=subscription_id,
                )
                if not should_process:
                    return

                subscription = (
                    Subscription.objects.select_for_update()
                    .select_related("business")
                    .filter(id=subscription_id)
                    .first()
                )
                if not subscription:
                    raise Subscription.DoesNotExist("Subscription does not exist")

                failure_serializer = SubscriptionPaymentFailureSerializer(
                    instance=subscription,
                    data={
                        "metadata": metadata,
                        "transaction_id": transaction_id,
                    },
                )
                failure_serializer.is_valid(raise_exception=True)
                subscription = failure_serializer.save(
                    event=event,
                    event_type=event_type,
                    payment_type=payment_type,
                )

        except Exception:
            raise
