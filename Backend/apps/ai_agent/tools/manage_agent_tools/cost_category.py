import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from apps.cost.models import CostCategory
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_cost_category(name: str = None, description: str = None, gst_rate: str = None) -> dict:
    """
    Opens the Add Cost Category form on the frontend.
    Provide pre-fill information (name, description, gst_rate) from user intent to auto-populate the form.
    """
    return make_panel_trigger(
        "add_cost_category",
        name=name,
        description=description,
        gst_rate=gst_rate
    )

async def trigger_edit_cost_category(id: int) -> dict:
    """Opens the Edit Cost Category form for the given category ID. Call this after finding the category ID via search_cost_categories."""
    return await verify_and_trigger_edit(CostCategory, id, "edit_cost_category", "Cost Category")

async def search_cost_categories(query: str) -> List[Dict[str, Any]]:
    """
    Search for cost categories by name.
    Use this to find cost category IDs for editing.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    raw = await sync_to_async(list)(
        CostCategory.objects.filter(
            business_id=ctx.get("business_id"),
            name__icontains=query
        ).values("id", "name", "gst_rate", "description")[:10]
    )
    # Decimal is not JSON serializable — convert to float
    return [
        {**item, "gst_rate": float(item["gst_rate"]) if item.get("gst_rate") else 0.0}
        for item in raw
    ]
