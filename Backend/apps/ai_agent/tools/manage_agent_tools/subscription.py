import logging
from asgiref.sync import sync_to_async
from apps.subscription.models import Subscription
from apps.ai_agent.utils.context import current_user_context

logger = logging.getLogger(__name__)

async def trigger_view_plans() -> dict:
    """
    Triggers the Subscription Plans display/selection panel on the frontend,
    allowing the user to see, select, and purchase premium subscription plans.
    """
    return {"type": "panel_trigger", "panel": "view_plans"}

async def get_active_subscription() -> dict:
    """
    Retrieves the current active subscription plan details and quotas/limits for the business.
    """
    ctx = current_user_context.get()
    if not ctx:
        return {"error": "Authentication context missing."}

    def fetch_subscription():
        sub = Subscription.objects.filter(business_id=ctx.get("business_id"), is_active=True).order_by("-end_date").first()
        if not sub:
            return {"active": False, "message": "No active premium subscription found."}
        
        return {
            "active": True,
            "plan_name": sub.plan_name,
            "price": float(sub.price) if sub.price else 0.0,
            "duration_days": sub.duration_days,
            "start_date": sub.start_date.isoformat() if sub.start_date else None,
            "end_date": sub.end_date.isoformat() if sub.end_date else None,
            "max_products": sub.max_products,
            "max_invoices": sub.max_invoices,
            "max_staff": sub.max_staff,
            "max_branches": sub.max_branches,
            "is_trial": sub.is_trial,
        }

    return await sync_to_async(fetch_subscription)()
