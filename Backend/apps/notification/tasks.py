from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.notification.models import Notification
from apps.notification.serializers import NotificationReadSerializer

@shared_task
def send_notification_task(notification_id, request_context=None):
    """
    Background task to send WebSocket notification.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        serializer = NotificationReadSerializer(
            notification,
            context=request_context if request_context else {}
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"notification_{notification.user_id}",
                {
                    "type": "notification",
                    "id": notification.id,
                    "title": notification.title,
                    "content": notification.content,
                    "action_type": notification.action_type,
                    "action_link": notification.action_link,
                    "is_read": notification.is_read,
                    "created_at": str(notification.created_at),
                    "actor": serializer.data.get("actor"),
                    "user": serializer.data.get("user"),
                }
            )
    except Notification.DoesNotExist:
        pass


@shared_task
def trigger_reminder_task(reminder_id):
    """
    Triggers a scheduled reminder by sending a platform notification in real-time.
    Handles recursive rescheduling for daily, weekly, and monthly repeat configurations.
    """
    from apps.notification.models import Reminder
    from apps.notification.utils import send_notification
    from django.utils import timezone
    from datetime import timedelta
    from dateutil.relativedelta import relativedelta

    try:
        reminder = Reminder.objects.get(id=reminder_id, is_sent=False)
        
        # Generate dynamic action link based on the entity
        action_link = None
        first_link = reminder.links.first()
        if first_link:
            model = first_link.content_type.model
            if model == 'costcategory':
                action_link = f"/cost-category/month?category_id={first_link.object_id}"

        # Dispatch platform notification
        send_notification(
            user=reminder.user,
            title=f"Reminder: {reminder.title}",
            content=reminder.content or "No descriptive details provided.",
            action_type="SYSTEM",
            action_link=action_link
        )
        
        # Handle recurrence repeat patterns
        if reminder.recurrence and reminder.recurrence != 'NONE':
            next_remind_at = reminder.remind_at
            now = timezone.now()
            
            # Calculate next future occurrence
            while next_remind_at <= now:
                if reminder.recurrence == 'DAILY':
                    next_remind_at += timedelta(days=1)
                elif reminder.recurrence == 'WEEKLY':
                    next_remind_at += timedelta(weeks=1)
                elif reminder.recurrence == 'MONTHLY':
                    next_remind_at += relativedelta(months=1)
                else:
                    break
            
            # Queue next execution task
            task_res = trigger_reminder_task.apply_async(args=[reminder.id], eta=next_remind_at)
            
            # Update reminder fields for next dynamic run
            reminder.remind_at = next_remind_at
            reminder.celery_task_id = task_res.id
            reminder.save(update_fields=["remind_at", "celery_task_id"])
        else:
            # One-off reminder, mark as sent and clear task ID
            reminder.is_sent = True
            reminder.celery_task_id = None
            reminder.save(update_fields=["is_sent", "celery_task_id"])
        
    except Reminder.DoesNotExist:
        pass
