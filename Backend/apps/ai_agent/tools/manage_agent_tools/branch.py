import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from apps.business.models import Branch
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_branch(
    name: str = None, 
    contact_number: str = None, 
    address_line_1: str = None, 
    address_line_2: str = None, 
    city: str = None, 
    state: str = None, 
    country: str = None, 
    pin_code: str = None
) -> dict:
    """
    Opens the Add Branch form on the frontend.
    Provide pre-fill information from user intent to auto-populate the form.
    """
    return make_panel_trigger(
        "add_branch",
        name=name,
        contact_number=contact_number,
        address_line_1=address_line_1,
        address_line_2=address_line_2,
        city=city,
        state=state,
        country=country,
        pin_code=pin_code
    )

async def trigger_edit_branch(id: int) -> dict:
    """Opens the Edit Branch form for the given branch ID. Call this after finding the branch ID via list_branches."""
    return await verify_and_trigger_edit(Branch, id, "edit_branch", "Branch")

async def list_branches() -> List[Dict[str, Any]]:
    """
    Returns a list of all branches for the current business.
    Use this to find IDs for editing or checking branch names.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    branches = await sync_to_async(list)(
        Branch.objects.filter(business_id=ctx.get("business_id")).values("id", "name", "contact_number", "is_default")
    )
    return branches
