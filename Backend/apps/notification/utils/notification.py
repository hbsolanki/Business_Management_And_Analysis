from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.notification.models import Notification


def _publish_notification(notification, actor_data=None, group_name=None):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        group_name or f"notification_{notification.user_id}",
        {
            "type": "notification",
            "id": notification.id,
            "title": notification.title,
            "content": notification.content,
            "action_type": notification.action_type,
            "action_link": notification.action_link,
            "is_read": notification.is_read,
            "created_at": str(notification.created_at),
            "actor": actor_data,
        },
    )

def send_notification(user, title, content, action_type, actor=None, action_link=None, request=None):
    """
    Generalized function to create a notification and publish it immediately.
    """
    notification = Notification.objects.create(
        user=user,
        actor=actor,
        title=title,
        content=content,
        action_type=action_type,
        action_link=action_link,
    )

    actor_data = None
    if actor:
        from apps.master.serializers.user import UserBasicDetailsSerializer

        actor_data = UserBasicDetailsSerializer(actor).data

    _publish_notification(notification, actor_data=actor_data)
    
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

    # Send WebSocket broadcast immediately so live clients update without Celery.
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
