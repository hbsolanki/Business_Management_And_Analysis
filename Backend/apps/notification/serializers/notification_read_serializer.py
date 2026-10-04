from django.utils import timezone
from rest_framework import serializers

from apps.notification.models import Notification, Reminder, ReminderLink
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


# ---------------------------------------------------------------------------
# CreateEntityReminderSerializer  (shared input serializer for all entities)
# ---------------------------------------------------------------------------



class NotificationReadSerializer(serializers.ModelSerializer):
    user = UserBasicDetailsSerializer(read_only=True)
    actor = UserBasicDetailsSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "user", "actor", "title", "content",
            "action_type", "action_link", "is_read", "created_at"
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# ReminderLink
# ---------------------------------------------------------------------------
