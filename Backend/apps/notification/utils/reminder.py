"""
Utility: create_entity_reminder
================================
A single reusable function that:
  1. Validates and creates a Reminder
  2. Schedules the Celery alert task
  3. Creates a ReminderLink tying the reminder to any entity instance

Usage:
    from apps.notification.utils import create_entity_reminder

    reminder = create_entity_reminder(
        request=request,
        entity_instance=my_task,       # Any Django model instance
        title="Reminder title",
        content="Optional description",
        remind_at=datetime_object,     # Must be a future datetime (timezone-aware)
        recurrence="NONE",             # NONE | DAILY | WEEKLY | MONTHLY
    )
"""

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework import serializers


def create_entity_reminder(request, entity_instance, title, remind_at, content="", recurrence="NONE"):
    """
    Create a Reminder record and link it to `entity_instance` via ReminderLink.

    Parameters
    ----------
    request : Request
        DRF request — used to extract the authenticated user.
    entity_instance : models.Model
        Any Django model instance to link the reminder to.
    title : str
        Title of the reminder.
    remind_at : datetime
        Timezone-aware future datetime when the reminder should fire.
    content : str, optional
        Descriptive notes for the reminder.
    recurrence : str, optional
        Recurrence pattern — one of NONE, DAILY, WEEKLY, MONTHLY.

    Returns
    -------
    Reminder
        The created (and scheduled) Reminder instance.

    Raises
    ------
    serializers.ValidationError
        If remind_at is not in the future.
    """
    from apps.notification.models import Reminder, ReminderLink
    from apps.notification.tasks import trigger_reminder_task

    # --- Validation ---
    if remind_at <= timezone.now():
        raise serializers.ValidationError({"remind_at": "Reminder time must be in the future."})

    # --- Create Reminder ---
    reminder = Reminder.objects.create(
        user = request.user,
        created_by=request.user,
        title=title,
        content=content or "",
        remind_at=remind_at,
        recurrence=recurrence,
        is_sent=False,
    )

    # --- Schedule Celery task ---
    task_result = trigger_reminder_task.apply_async(args=[reminder.id], eta=reminder.remind_at)
    reminder.celery_task_id = task_result.id
    reminder.save(update_fields=["celery_task_id"])

    # --- Create the polymorphic link ---
    content_type = ContentType.objects.get_for_model(entity_instance)
    ReminderLink.objects.get_or_create(
        reminder=reminder,
        content_type=content_type,
        object_id=entity_instance.pk,
    )

    return reminder


def get_entity_reminders(entity_instance):
    """
    Return all active (non-deleted) reminders linked to `entity_instance`.

    Parameters
    ----------
    entity_instance : models.Model
        Any Django model instance.

    Returns
    -------
    QuerySet[Reminder]
        Ordered by remind_at ascending.
    """
    from apps.notification.models import Reminder, ReminderLink
    content_type = ContentType.objects.get_for_model(entity_instance)
    linked_reminder_ids = ReminderLink.objects.filter(
        content_type=content_type,
        object_id=entity_instance.pk,
    ).values_list("reminder_id", flat=True)
    return Reminder.objects.filter(id__in=linked_reminder_ids).order_by("remind_at")
