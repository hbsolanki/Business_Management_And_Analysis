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
