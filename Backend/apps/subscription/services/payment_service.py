from django.utils import timezone
from django.db import transaction
from datetime import timedelta

from apps.subscription.models import Subscription, SubscriptionWebhookEvent, Usage
from apps.subscription.tasks import send_subscription_email
from apps.notification.utils import send_notification
from apps.notification.models import Notification
from apps.user.models import User


class SubscriptionPaymentService:
    @staticmethod
    def _validate_metadata(subscription, metadata):
        metadata_business_id = metadata.get("business_id")
        if metadata_business_id is None:
            return

        if str(subscription.business_id) != str(metadata_business_id):
            raise ValueError("Metadata business does not match subscription business")

    @staticmethod
    def _init_event(event_id, event_type, payment_type, subscription_id):
        if not event_id:
            return None, True

        event, created = SubscriptionWebhookEvent.objects.get_or_create(
            stripe_event_id=event_id,
            defaults={
                "event_type": event_type,
                "payment_type": payment_type,
                "subscription_id": subscription_id,
            },
        )

        if not created:
            # Lock the existing event to ensure thread-safe idempotency checks
            event = SubscriptionWebhookEvent.objects.select_for_update().get(
                pk=event.pk
            )
            if (
                subscription_id
                and event.subscription_id
                and str(event.subscription_id) != str(subscription_id)
            ):
                raise ValueError("Stripe event id reused with different subscription")
            if event_type and event.event_type != event_type:
                raise ValueError("Stripe event id reused with different event type")
            if (
                payment_type
                and event.payment_type
                and event.payment_type != payment_type
            ):
                raise ValueError("Stripe event id reused with different payment type")
            if event.is_processed:
                return event, False

        if event.subscription_id is None and subscription_id:
            event.subscription_id = subscription_id
            event.save(update_fields=["subscription", "updated_at"])

        return event, True

    @staticmethod
    def _complete_event(event):
        if not event:
            return
        event.is_processed = True
        event.processed_at = timezone.now()
        event.error_message = None
        event.save(
            update_fields=[
                "is_processed",
                "processed_at",
                "error_message",
                "updated_at",
            ]
        )

    @staticmethod
    def _fail_event(event, error_message):
        if not event:
            return
        event.error_message = error_message
        event.save(update_fields=["error_message", "updated_at"])

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

        exc_to_raise = None
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

                try:
                    with transaction.atomic():
                        subscription = (
                            Subscription.objects.select_for_update()
                            .select_related("business")
                            .get(id=subscription_id)
                        )
                        SubscriptionPaymentService._validate_metadata(
                            subscription, metadata
                        )

                        if (
                            subscription.payment_reference == str(transaction_id)
                            and subscription.is_active
                        ):
                            SubscriptionPaymentService._complete_event(event)
                            return

                        now = timezone.now()
                        active_sub = (
                            Subscription.objects.select_for_update()
                            .filter(business=subscription.business, is_active=True)
                            .exclude(id=subscription.id)
                            .first()
                        )

                        if active_sub:
                            if subscription.plan_id == active_sub.plan_id:
                                # Same-plan renewal: merge into active_sub and extend it
                                active_sub.end_date += timedelta(
                                    days=subscription.duration_days
                                )
                                if (
                                    subscription.max_products is not None
                                    and active_sub.max_products is not None
                                ):
                                    active_sub.max_products += subscription.max_products
                                if (
                                    subscription.max_invoices is not None
                                    and active_sub.max_invoices is not None
                                ):
                                    active_sub.max_invoices += subscription.max_invoices
                                if (
                                    subscription.max_staff is not None
                                    and active_sub.max_staff is not None
                                ):
                                    active_sub.max_staff += subscription.max_staff
                                active_sub.save(
                                    update_fields=[
                                        "end_date",
                                        "max_products",
                                        "max_invoices",
                                        "max_staff",
                                    ]
                                )

                                subscription.is_active = False
                                subscription.status = (
                                    Subscription.SubscriptionStatus.SUPERSEDED
                                )
                            elif (subscription.price or 0) >= (active_sub.price or 0):
                                # Immediate Upgrade: supersede the existing active subscription
                                active_sub.is_active = False
                                active_sub.status = (
                                    Subscription.SubscriptionStatus.SUPERSEDED
                                )
                                active_sub.cancelled_at = now
                                active_sub.save(
                                    update_fields=[
                                        "is_active",
                                        "status",
                                        "cancelled_at",
                                    ]
                                )

                                subscription.is_active = True
                                subscription.status = (
                                    Subscription.SubscriptionStatus.ACTIVE
                                )
                                subscription.start_date = now
                                subscription.end_date = now + timedelta(
                                    days=subscription.duration_days
                                )
                            else:
                                # Downgrade / Queue: queue it to start after the active subscription ends
                                subscription.is_active = False
                                subscription.status = (
                                    Subscription.SubscriptionStatus.PENDING_PAYMENT
                                )
                                subscription.start_date = active_sub.end_date
                                subscription.end_date = active_sub.end_date + timedelta(
                                    days=subscription.duration_days
                                )
                        else:
                            # No active subscription currently. Check if this is queued in the future.
                            is_queued = subscription.start_date > now
                            if not is_queued:
                                subscription.is_active = True
                                subscription.status = (
                                    Subscription.SubscriptionStatus.ACTIVE
                                )
                            else:
                                subscription.is_active = False
                                subscription.status = (
                                    Subscription.SubscriptionStatus.PENDING_PAYMENT
                                )

                        subscription.payment_mode = "ONLINE"
                        subscription.transaction_id = str(transaction_id)
                        subscription.payment_reference = str(transaction_id)
                        subscription.payment_date = now
                        subscription.cancelled_at = None
                        subscription.expired_at = None
                        subscription.failed_at = None
                        subscription.save(
                            update_fields=[
                                "payment_date",
                                "payment_mode",
                                "transaction_id",
                                "payment_reference",
                                "is_active",
                                "status",
                                "start_date",
                                "end_date",
                                "cancelled_at",
                                "expired_at",
                                "failed_at",
                            ]
                        )

                        Usage.objects.get_or_create(subscription=subscription)
                        SubscriptionPaymentService._complete_event(event)
                except Exception as inner_exc:
                    SubscriptionPaymentService._fail_event(event, str(inner_exc))
                    exc_to_raise = inner_exc

            if exc_to_raise:
                if isinstance(exc_to_raise, Subscription.DoesNotExist):
                    return
                raise exc_to_raise

            if user_id:
                user = User.objects.filter(id=user_id).first()
                if user:
                    # Log activity
                    from apps.activity_log.models import ActivityLog

                    ActivityLog.objects.log(
                        business=subscription.business,
                        actor=user,
                        action=ActivityLog.Action.PURCHASE,
                        module=ActivityLog.Module.SUBSCRIPTION,
                        message=f"Purchased {subscription.plan_name} plan",
                        target_model="Subscription",
                        target_id=subscription.id,
                    )

                    # Send Notification
                    send_notification(
                        user=user,
                        title="Subscription Purchased",
                        content=f"Your purchase of the {subscription.plan_name} plan was successful!",
                        action_type=Notification.ActionType.SUBSCRIPTION_PURCHASED,
                        action_link="/subscription/plan/purchased/",
                    )

                send_subscription_email.delay(
                    subscription_id=int(subscription.id), user_id=int(user_id)
                )
        except Subscription.DoesNotExist:
            if event_id:
                event = SubscriptionWebhookEvent.objects.filter(
                    stripe_event_id=event_id
                ).first()
                SubscriptionPaymentService._fail_event(
                    event, "Subscription does not exist"
                )
            return
        except Exception as exc:
            if event_id:
                event = SubscriptionWebhookEvent.objects.filter(
                    stripe_event_id=event_id
                ).first()
                SubscriptionPaymentService._fail_event(event, str(exc))
            raise

    @staticmethod
    def handle_failure(
        metadata,
        event_id=None,
        event_type="payment_intent.payment_failed",
        payment_type="SUBSCRIPTION",
    ):
        subscription_id = metadata.get("subscription_id")
        if not subscription_id:
            return

        exc_to_raise = None
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

                try:
                    with transaction.atomic():
                        subscription = (
                            Subscription.objects.select_for_update()
                            .filter(id=subscription_id)
                            .first()
                        )
                        if not subscription:
                            raise Subscription.DoesNotExist(
                                "Subscription does not exist"
                            )

                        SubscriptionPaymentService._validate_metadata(
                            subscription, metadata
                        )

                        if subscription.is_active:
                            SubscriptionPaymentService._complete_event(event)
                            return

                        subscription.is_active = False
                        subscription.status = Subscription.SubscriptionStatus.FAILED
                        subscription.failed_at = timezone.now()
                        subscription.save(
                            update_fields=["is_active", "status", "failed_at"]
                        )
                        SubscriptionPaymentService._complete_event(event)
                except Exception as inner_exc:
                    SubscriptionPaymentService._fail_event(event, str(inner_exc))
                    exc_to_raise = inner_exc

            if exc_to_raise:
                if isinstance(exc_to_raise, Subscription.DoesNotExist):
                    return
                raise exc_to_raise
        except Exception:
            raise
