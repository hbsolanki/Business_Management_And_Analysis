from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.activity_log.serializers import ActivityLogSerializer

def broadcast_activity_log(log_instance):
    """
    Broadcasts the activity log message to the business-specific group.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    serializer = ActivityLogSerializer(log_instance)
    business_id = log_instance.business_id
    branch_id = getattr(log_instance, 'branch_id', None)
    
    if not business_id:
        return

    global_group = f"activity_logs_{business_id}"
    async_to_sync(channel_layer.group_send)(
        global_group,
        {
            "type": "activity_log_message",
            "data": serializer.data
        }
    )

    if branch_id:
        branch_group = f"activity_logs_branch_{branch_id}"
        async_to_sync(channel_layer.group_send)(
            branch_group,
            {
                "type": "activity_log_message",
                "data": serializer.data
            }
        )
