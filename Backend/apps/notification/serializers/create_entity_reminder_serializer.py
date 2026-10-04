from django.utils import timezone
from rest_framework import serializers

from apps.notification.models import Notification, Reminder, ReminderLink
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


# ---------------------------------------------------------------------------
# CreateEntityReminderSerializer  (shared input serializer for all entities)
# ---------------------------------------------------------------------------


from .reminder_serializer import ReminderSerializer

class CreateEntityReminderSerializer(serializers.Serializer):
    """
    Reusable write serializer for creating a reminder linked to any entity.

    Usage in a ViewSet action:
        serializer = CreateEntityReminderSerializer(
            data=request.data,
            context={"request": request, "entity_instance": my_object}
        )
        serializer.is_valid(raise_exception=True)
        reminder = serializer.save()
        return Response(ReminderSerializer(reminder).data, status=201)
    """
    title      = serializers.CharField(max_length=255)
    content    = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    remind_at  = serializers.DateTimeField()
    recurrence = serializers.ChoiceField(
        choices=["NONE", "DAILY", "WEEKLY", "MONTHLY"],
        default="NONE",
        required=False,
    )

    def validate_remind_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Reminder time must be in the future.")
        return value

    def create(self, validated_data):
        request         = self.context["request"]
        entity_instance = self.context["entity_instance"]

        from apps.notification.utils import create_entity_reminder
        return create_entity_reminder(
            request=request,
            entity_instance=entity_instance,
            title=validated_data["title"],
            content=validated_data.get("content") or "",
            remind_at=validated_data["remind_at"],
            recurrence=validated_data.get("recurrence", "NONE"),
        )


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------
