import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from django.db.models import Q
from apps.business.models import BusinessCustomer
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_customer(
    name: str = None,
    mobile_number: str = None,
    email: str = None,
    age: int = None,
    gender: str = None,
) -> dict:
    """
    Opens the Add Customer form on the frontend.
    Provide pre-fill information (name, mobile_number, email, age, gender) from user intent to auto-populate the form.
    gender should be one of: MALE, FEMALE, OTHER.
    """
    return make_panel_trigger(
        "add_customer",
        name=name,
        mobile_number=mobile_number,
        email=email,
        age=age,
        gender=gender.upper() if gender else None
    )

async def trigger_edit_customer(id: int) -> dict:
    """Opens the Edit Customer form for the given customer ID. Call this after finding the ID using search_customers."""
    return await verify_and_trigger_edit(BusinessCustomer, id, "edit_customer", "Customer")

async def search_customers(query: str = "") -> List[Dict[str, Any]]:
    """
    Searches for customers by name, mobile number, or email.
    Returns a list of matching customers with their IDs.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    def get_matching_customers():
        qs = BusinessCustomer.objects.filter(business_id=ctx.get("business_id"))
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(mobile_number__icontains=query) |
                Q(email__icontains=query)
            )
        return list(qs.values("id", "name", "mobile_number", "email", "gender", "age"))

    return await sync_to_async(get_matching_customers)()
