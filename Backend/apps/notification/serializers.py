from django.utils import timezone
from rest_framework import serializers

from apps.notification.models import Notification, Reminder, ReminderLink
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


# ---------------------------------------------------------------------------
# CreateEntityReminderSerializer  (shared input serializer for all entities)
# ---------------------------------------------------------------------------

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

class ReminderSerializer(BaseSerializer):
    links = ReminderLinkSerializer(many=True, read_only=True)

    class Meta:
        model = Reminder
        fields = BaseSerializer.Meta.fields + [
            "title", "content", "remind_at", "recurrence", "is_sent", "links"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["is_sent", "links"]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['user'] = request.user
            validated_data['created_by'] = request.user

        reminder = super().create(validated_data)

        from apps.notification.tasks import trigger_reminder_task
        task_res = trigger_reminder_task.apply_async(args=[reminder.id], eta=reminder.remind_at)
        reminder.celery_task_id = task_res.id
        reminder.save(update_fields=["celery_task_id"])

        return reminder

    def update(self, instance, validated_data):
        # Revoke previous scheduled Celery task if scheduled
        if instance.celery_task_id:
            from bma.celery import app
            try:
                app.control.revoke(instance.celery_task_id, terminate=True)
            except Exception:
                pass

        instance.is_sent = False
        reminder = super().update(instance, validated_data)

        # Re-schedule the new alert trigger task
        from apps.notification.tasks import trigger_reminder_task
        task_res = trigger_reminder_task.apply_async(args=[reminder.id], eta=reminder.remind_at)
        reminder.celery_task_id = task_res.id
        reminder.save(update_fields=["celery_task_id", "is_sent"])

        return reminder