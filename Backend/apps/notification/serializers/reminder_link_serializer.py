from django.utils import timezone
from rest_framework import serializers

from apps.notification.models import Notification, Reminder, ReminderLink
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


# ---------------------------------------------------------------------------
# CreateEntityReminderSerializer  (shared input serializer for all entities)
# ---------------------------------------------------------------------------



class ReminderLinkSerializer(serializers.ModelSerializer):
    """
    Serializes a ReminderLink record, exposing:
      - id / created_at
      - entity_type  — the app_label.model string (e.g. "tasks.task")
      - entity_id    — the PK of the linked object
      - entity_label — a human-readable display label for the linked object
    """
    entity_type = serializers.SerializerMethodField()
    entity_id = serializers.SerializerMethodField()
    entity_label = serializers.SerializerMethodField()

    class Meta:
        model = ReminderLink
        fields = ["id", "entity_type", "entity_id", "entity_label", "created_at"]
        read_only_fields = fields

    def get_entity_type(self, obj):
        return f"{obj.content_type.app_label}.{obj.content_type.model}"

    def get_entity_id(self, obj):
        return obj.object_id

    def get_entity_label(self, obj):
        """Return a display-friendly label for the linked object."""
        try:
            instance = obj.linked_object
            if instance is None:
                return f"#{obj.object_id} (deleted)"
            # Try common label fields in priority order
            for attr in ("title", "name", "__str__"):
                if attr == "__str__":
                    return str(instance)
                val = getattr(instance, attr, None)
                if val:
                    return str(val)
        except Exception:
            pass
        return f"#{obj.object_id}"


# ---------------------------------------------------------------------------
# Reminder
# ---------------------------------------------------------------------------
