from django.utils import timezone
from apps.subscription.models import Subscription
from apps.subscription.tasks import send_subscription_email
from apps.notification.utils import send_notification
from apps.notification.models import Notification
from apps.user.models import User

class SubscriptionPaymentService:
    @staticmethod
    def handle_success(metadata, transaction_id):
        subscription_id = metadata.get('subscription_id')
        user_id = metadata.get('user_id')
        if not subscription_id:
            return

        try:
            subscription = Subscription.objects.get(id=subscription_id)
            subscription.payment_mode = "ONLINE"
            subscription.payment_reference = transaction_id
            subscription.payment_date = timezone.now()
            subscription.save(update_fields=['payment_date', 'payment_mode', 'payment_reference'])

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
                        target_id=subscription.id
                    )

                    # Send Notification
                    send_notification(
                        user=user,
                        title="Subscription Purchased",
                        content=f"Your purchase of the {subscription.plan_name} plan was successful!",
                        action_type=Notification.ActionType.SUBSCRIPTION_PURCHASED,
                        action_link="/subscription/plan/purchased/"
                    )

                res = send_subscription_email.delay(
                    subscription_id=int(subscription.id), 
                    user_id=int(user_id)
                )
            else:
                pass
        except Subscription.DoesNotExist:
            pass

    @staticmethod
    def handle_failure(metadata):
        subscription_id = metadata.get('subscription_id')
        if subscription_id:
            Subscription.objects.filter(id=subscription_id).delete()
