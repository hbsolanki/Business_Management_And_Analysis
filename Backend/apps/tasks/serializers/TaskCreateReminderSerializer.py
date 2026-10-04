from django.utils import timezone
from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.notification.utils import create_entity_reminder

class TaskCreateReminderSerializer(BaseSerializer):
    title = serializers.CharField(max_length=255)
    content = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    remind_at = serializers.DateTimeField()
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
        task = self.context["task"]
        request = self.context["request"]

        reminder = create_entity_reminder(
            request=request,
            entity_instance=task,
            title=validated_data["title"],
            content=validated_data.get("content") or "",
            remind_at=validated_data["remind_at"],
            recurrence=validated_data.get("recurrence", "NONE"),
        )
        return reminder


