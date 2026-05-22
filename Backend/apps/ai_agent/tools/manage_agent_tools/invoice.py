import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from django.db.models import Q
from apps.invoice.models import Invoice
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger

logger = logging.getLogger(__name__)

async def trigger_add_invoice(
    branch_id: int = None,
    customer_name: str = None,
    customer_mobile: str = None,
    payment_mode: str = None,
) -> dict:
    """
    Opens the Create Invoice form on the frontend.
    Provide pre-fill information (branch_id, customer_name, customer_mobile, payment_mode) from user intent.
    payment_mode should be one of: CASH, ONLINE.
    """
    return make_panel_trigger(
        "add_invoice",
        branch_id=branch_id,
        customer_name=customer_name,
        customer_mobile=customer_mobile,
        payment_mode=payment_mode.upper() if payment_mode else None
    )

async def search_invoices(query: str = "") -> List[Dict[str, Any]]:
    """
    Searches for invoices by customer name, mobile number, or invoice ID.
    Returns a list of matching invoices with their IDs, customer info, and total amount.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    def get_matching_invoices():
        qs = Invoice.objects.filter(business_id=ctx.get("business_id"))
        if query:
            qs = qs.filter(
                Q(id__icontains=query) |
                Q(customer__name__icontains=query) |
                Q(customer__mobile_number__icontains=query)
            )
        return [
            {
                "id": inv.id,
                "branch_id": inv.branch_id,
                "customer_name": inv.customer.name if inv.customer else None,
                "customer_mobile": inv.customer.mobile_number if inv.customer else None,
                "total_amount": float(inv.total_amount) if hasattr(inv, "total_amount") else None,
                "payment_mode": inv.payment_mode if hasattr(inv, "payment_mode") else None,
            }
            for inv in qs.select_related("customer", "branch")[:20]
        ]

    return await sync_to_async(get_matching_invoices)()
