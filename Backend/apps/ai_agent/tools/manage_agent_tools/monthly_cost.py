import logging
from typing import Any, Dict, List, Optional
from asgiref.sync import sync_to_async
from apps.cost.models import CostCategory, MonthlyCostCategory
from apps.ai_agent.utils.context import current_user_context

logger = logging.getLogger(__name__)

async def trigger_add_monthly_cost(branch_id: Optional[int] = None, month: Optional[int] = None, year: Optional[int] = None) -> dict:
    """
    Opens the Record Monthly Cost form. 
    Pass branch_id, month, and year to pre-fill the form context.
    """
    return {
        "type": "panel_trigger", 
        "panel": "add_monthly_cost",
        "branch_id": branch_id,
        "month": month,
        "year": year
    }

async def trigger_edit_monthly_cost(id: int) -> dict:
    """Opens the Edit Monthly Cost form for the given monthly cost entry ID. Call this after finding the ID via search_monthly_costs."""
    ctx = current_user_context.get()
    if not ctx:
        return {"error": "Authentication context missing."}

    exists = await sync_to_async(
        MonthlyCostCategory.objects.filter(id=id, monthly_summary__business_id=ctx.get("business_id")).exists
    )()
    if not exists:
        return {"error": f"Monthly Cost entry with ID {id} not found."}

    return {"type": "panel_trigger", "panel": "edit_monthly_cost", "id": id}

async def search_monthly_costs(branch_name: Optional[str] = None, month: Optional[int] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Search for monthly cost category entries by branch, month, or year.
    Use this to find existing monthly cost entries to edit.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    filters = {"monthly_summary__business_id": ctx.get("business_id")}
    if branch_name:
        filters["monthly_summary__branch__name__icontains"] = branch_name
    if month:
        filters["monthly_summary__month"] = month
    if year:
        filters["monthly_summary__year"] = year

    raw = await sync_to_async(list)(
        MonthlyCostCategory.objects.filter(**filters).select_related(
            "cost_category", "monthly_summary", "monthly_summary__branch"
        ).values(
            "id", 
            "cost_category__name", 
            "cost", 
            "monthly_summary__month", 
            "monthly_summary__year",
            "monthly_summary__branch__name"
        )[:10]
    )
    
    return [
        {
            "id": item["id"],
            "category": item["cost_category__name"],
            "cost": float(item["cost"]),
            "month": item["monthly_summary__month"],
            "year": item["monthly_summary__year"],
            "branch": item["monthly_summary__branch__name"]
        }
        for item in raw
    ]

async def get_monthly_cost_status(branch_name: Optional[str] = None, branch_id: Optional[int] = None, month: Optional[int] = None, year: Optional[int] = None) -> Dict[str, Any]:
    """
    Get a summary of recorded vs pending monthly costs for a given period.
    Returns counts and names of pending categories.
    """
    ctx = current_user_context.get()
    if not ctx:
        return {"error": "Authentication context missing."}

    from apps.business.models import Branch
    from datetime import datetime
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    business_id = ctx.get("business_id")
    resolved_branch_id = branch_id

    if branch_name and not resolved_branch_id:
        branch = await sync_to_async(Branch.objects.filter(business_id=business_id, name__icontains=branch_name).first)()
        if branch:
            resolved_branch_id = branch.id

    def sync_fetch():
        # Get all categories for this business
        cat_qs = CostCategory.objects.filter(business_id=business_id)
        
        all_cats = list(cat_qs.values("id", "name"))

        # Get recorded categories for this month/year
        recorded_qs = MonthlyCostCategory.objects.filter(
            monthly_summary__business_id=business_id,
            monthly_summary__month=m,
            monthly_summary__year=y
        )
        if resolved_branch_id:
            recorded_qs = recorded_qs.filter(monthly_summary__branch_id=resolved_branch_id)
            
        recorded_cat_ids = set(recorded_qs.values_list("cost_category_id", flat=True))
        
        pending = [c["name"] for c in all_cats if c["id"] not in recorded_cat_ids]
        recorded_names = [c["name"] for c in all_cats if c["id"] in recorded_cat_ids]

        return {
            "month": m,
            "year": y,
            "branch_id": resolved_branch_id,
            "total_categories": len(all_cats),
            "recorded_count": len(recorded_names),
            "pending_count": len(pending),
            "pending_list": pending[:10],
            "recorded_list": recorded_names[:10]
        }

    return await sync_to_async(sync_fetch)()
