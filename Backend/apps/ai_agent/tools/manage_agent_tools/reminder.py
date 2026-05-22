import logging
from asgiref.sync import sync_to_async
from django.utils import timezone
from datetime import datetime
from apps.notification.models import Reminder
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_reminder(
    title: str = None,
    remind_at: str = None,
    content: str = None,
    recurrence: str = "NONE"
) -> dict:
    """
    Opens the interactive Add Reminder form on the frontend workspace panel.
    Use this when the user requests scheduling or setting a reminder.
    Parameters:
      - title: Short pre-fill description or context of the reminder (e.g. 'Check Laptop inventory levels').
      - remind_at: Pre-fill ISO-8601 string of the scheduled time.
      - content: Extra descriptive details.
      - recurrence: Repeat pattern pre-fill: 'NONE', 'DAILY', 'WEEKLY', or 'MONTHLY'.
    """
    return make_panel_trigger(
        "add_reminder",
        title=title,
        remind_at=remind_at,
        content=content,
        recurrence=recurrence
    )

async def trigger_edit_reminder(id: int) -> dict:
    """
    Opens the Edit Reminder form on the frontend.
    """
    return await verify_and_trigger_edit(Reminder, id, "edit_reminder", "Reminder")

async def search_reminders(query: str = None) -> list:
    """
    Search for reminders set by the active user. Matches query against reminder title or content.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []
    user_id = ctx.get("user_id")
    if not user_id:
        return []

    @sync_to_async
    def get_reminders():
        from django.db.models import Q
        qs = Reminder.objects.filter(user_id=user_id)
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(content__icontains=query))
        return [
            {
                "id": r.id,
                "title": r.title,
                "content": r.content,
                "remind_at": r.remind_at.isoformat() if r.remind_at else None,
                "recurrence": r.recurrence,
                "is_active": r.is_active
            }
            for r in qs
        ]
        
    return await get_reminders()

async def create_reminder(
    title: str,
    remind_at: str,
    content: str = None,
    recurrence: str = "NONE"
) -> dict:
    """
    Creates a platform reminder directly in the database for the user at a specified date and time.
    Parameters:
      - title: A short description of the reminder (e.g., 'Check Laptop inventory levels').
      - remind_at: An ISO-8601 formatted datetime string representing when the user should be reminded (e.g. '2026-05-25T09:00:00+05:30').
      - content: Optional extra description or context of the reminder.
      - recurrence: Repeat pattern for the reminder: 'NONE', 'DAILY', 'WEEKLY', or 'MONTHLY'.
    """
    ctx = current_user_context.get()
    if not ctx:
        return {"success": False, "error": "No security context found. Please log in first."}

    user_id = ctx.get("user_id")
    if not user_id:
        return {"success": False, "error": "Unable to determine user context."}

    try:
        from django.utils.dateparse import parse_datetime
        dt = parse_datetime(remind_at)
        if not dt:
            dt = datetime.fromisoformat(remind_at)

        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())

        if dt < timezone.now():
            return {"success": False, "error": f"The scheduled reminder time {remind_at} is in the past."}

        # Normalize recurrence choices
        rec = recurrence.upper() if recurrence else "NONE"
        if rec not in ["NONE", "DAILY", "WEEKLY", "MONTHLY"]:
            rec = "NONE"

        @sync_to_async
        def save_reminder(u_id, r_title, r_content, r_time, r_rec):
            from apps.user.models import User
            user = User.all_objects.get(id=u_id)
            reminder = Reminder.objects.create(
                user=user,
                title=r_title,
                content=r_content,
                remind_at=r_time,
                recurrence=r_rec
            )

            # Queue background execution at ETA
            from apps.notification.tasks import trigger_reminder_task
            task_res = trigger_reminder_task.apply_async(args=[reminder.id], eta=r_time)
            reminder.celery_task_id = task_res.id
            reminder.save(update_fields=["celery_task_id"])
            return reminder

        reminder = await save_reminder(user_id, title, content, dt, rec)
        repeat_str = f" repeating {rec.lower()}" if rec != "NONE" else ""
        return {
            "success": True,
            "message": f"✓ Platform reminder set successfully: '{reminder.title}' scheduled for {dt.strftime('%Y-%m-%d %I:%M %p')}{repeat_str}."
        }
    except Exception as e:
        logger.error(f"Error creating reminder: {e}")
        return {"success": False, "error": f"Failed to create reminder: {str(e)}"}
