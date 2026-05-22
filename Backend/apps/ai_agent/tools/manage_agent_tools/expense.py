import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from apps.cost.models import Expense
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_expense(
    title: str = None,
    amount: str = None,
    description: str = None,
    date: str = None,
    category_id: int = None,
    branch_id: int = None
) -> dict:
    """
    Opens the Add Expense form on the frontend.
    Provide pre-fill information (title, amount, description, date, category_id, branch_id) from the user's intent to pre-populate the form.
    """
    return make_panel_trigger(
        "add_expense",
        title=title,
        amount=amount,
        description=description,
        date=date,
        category_id=category_id,
        branch_id=branch_id
    )

async def trigger_edit_expense(id: int) -> dict:
    """Opens the Edit Expense form for the given expense ID. Call this after finding the expense ID via search_expenses."""
    return await verify_and_trigger_edit(Expense, id, "edit_expense", "Expense")

async def search_expenses(query: str) -> List[Dict[str, Any]]:
    """
    Search for expenses by title.
    Use this to find expense IDs for editing.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    raw = await sync_to_async(list)(
        Expense.objects.filter(
            business_id=ctx.get("business_id"),
            title__icontains=query
        ).values("id", "title", "amount", "date")[:10]
    )
    return [
        {
            **item,
            "amount": float(item["amount"]),
            "date": str(item["date"])
        }
        for item in raw
    ]
