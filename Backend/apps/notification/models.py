from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.user.models import User
from apps.base.models import BaseModel
from apps.master.utils.text_choices import NotificationActionType, ReminderRecurrenceChoices

class Notification(BaseModel):
    ActionType = NotificationActionType

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='notifications')
    actor = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='triggered_notifications')
    title = models.CharField(max_length=100)
    content = models.TextField()
    action_type=models.CharField(max_length=50,choices=ActionType.choices,null=True,blank=True)
    action_link = models.TextField(null=True,blank=True)
    is_read = models.BooleanField(default=False)


    class Meta:
        db_table = 'bma_notification'
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]


class Reminder(BaseModel):
    RecurrenceChoices = ReminderRecurrenceChoices

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reminders")
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, null=True)
    remind_at = models.DateTimeField()
    recurrence = models.CharField(
        max_length=20,
        choices=RecurrenceChoices.choices,
        default=RecurrenceChoices.NONE
    )
    is_sent = models.BooleanField(default=False)
    celery_task_id = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'bma_reminder'
        ordering = ["remind_at"]
        indexes = [
            models.Index(fields=['user', 'is_sent', 'remind_at']),
        ]

    def delete(self, *args, **kwargs):
        # Revoke the Celery task before removing from database
        if self.celery_task_id:
            from bma.celery import app
            try:
                app.control.revoke(self.celery_task_id, terminate=True)
            except Exception:
                pass
        super().delete(*args, **kwargs)


class ReminderLink(models.Model):
    """
    Polymorphic mapping table that links a Reminder to any business entity
    (Task, PurchaseOrder, SalesOrder, MonthlyCostCategory, etc.) using
    Django's ContentTypes framework. This is the single source of truth
    for reminder-entity associations and requires zero schema changes
    to support new linkable entity types.
    """
    reminder = models.ForeignKey(
        Reminder,
        on_delete=models.CASCADE,
        related_name="links"
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="The Django model this reminder is linked to (e.g. tasks.Task)"
    )
    object_id = models.PositiveIntegerField(
        help_text="Primary key of the linked entity instance"
    )
    linked_object = GenericForeignKey("content_type", "object_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bma_reminder_link"
        unique_together = [("reminder", "content_type", "object_id")]
        indexes = [
            # Fast lookup: "all reminders for entity X"
            models.Index(fields=["content_type", "object_id"]),
            # Fast lookup: "all entities linked to reminder Y"
            models.Index(fields=["reminder"]),
        ]

    def __str__(self):
        return f"ReminderLink(reminder={self.reminder_id}, {self.content_type} #{self.object_id})"

