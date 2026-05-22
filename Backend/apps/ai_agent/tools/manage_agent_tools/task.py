import logging
from typing import Any, Dict, List, Optional
from asgiref.sync import sync_to_async
from django.db.models import Q
from apps.tasks.models import Task
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_task(
    title: str = None, 
    description: str = None, 
    remarks: str = None,
    assignee_id: str = None
) -> dict:
    """
    Opens the Create Task form.
    Provide pre-fill information (title, description, remarks, assignee_id) from user intent to auto-populate the form.
    """
    return make_panel_trigger(
        "add_task",
        title=title,
        description=description,
        remarks=remarks,
        assignee_id=assignee_id
    )

async def trigger_edit_task(id: int) -> dict:
    """Opens the Edit Task form for the given task ID. Call this after finding the ID via search_tasks."""
    return await verify_and_trigger_edit(Task, id, "edit_task", "Task")

async def search_tasks(query: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Search for tasks by title or description.
    Use this to find task IDs for editing or status updates.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    filters = Q(business_id=ctx.get("business_id"))
    if query:
        filters &= (Q(title__icontains=query) | Q(description__icontains=query))

    raw = await sync_to_async(list)(
        Task.objects.filter(filters).select_related("assignee").values(
            "id", "title", "status", "assignee__username"
        )[:10]
    )
    
    return [
        {
            "id": item["id"],
            "title": item["title"],
            "status": item["status"],
            "assignee": item["assignee__username"]
        }
        for item in raw
    ]
