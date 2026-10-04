from django.utils import timezone
from rest_framework import serializers

from apps.notification.models import Notification, Reminder, ReminderLink
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


# ---------------------------------------------------------------------------
# CreateEntityReminderSerializer  (shared input serializer for all entities)
# ---------------------------------------------------------------------------


from .reminder_link_serializer import ReminderLinkSerializer

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