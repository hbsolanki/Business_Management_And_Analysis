from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.notification.models import Notification
from apps.notification.serializers import NotificationReadSerializer

def send_notification(user, title, content, action_type, actor=None, action_link=None, request=None):
    """
    Generalized function to create a notification and offload delivery to Celery.
    """
    notification = Notification.objects.create(
        user=user,
        actor=actor,
        title=title,
        content=content,
        action_type=action_type,
        action_link=action_link,
    )
    
    # Offload WebSocket delivery to Celery
    from apps.notification.tasks import send_notification_task
    send_notification_task.delay(notification.id)
    
    return notification
def send_broadcast_notification(title, content, action_type, actor=None, action_link=None):
    """
    Broadcasts a notification to all users and sends it via WebSocket group.
    """
    from apps.user.models import User
    
    users = User.objects.filter(is_active=True)
    
    # Bulk create notifications in database
    notifications = [
        Notification(
            user=user,
            actor=actor,
            title=title,
            content=content,
            action_type=action_type,
            action_link=action_link,
        ) for user in users
    ]
    Notification.objects.bulk_create(notifications)

    # Send WebSocket broadcast
    channel_layer = get_channel_layer()
    if channel_layer:
        actor_data = None
        if actor:
            from apps.master.serializers.user import UserBasicDetailsSerializer
            actor_data = UserBasicDetailsSerializer(actor).data

        async_to_sync(channel_layer.group_send)(
            "broadcast",
            {
                "type": "notification",
                "title": title,
                "content": content,
                "action_type": action_type,
                "action_link": action_link,
                "created_at": str(timezone.now()),
                "is_read": False,
                "actor": actor_data,
            }
        )
