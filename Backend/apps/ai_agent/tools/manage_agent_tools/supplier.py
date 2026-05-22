import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from django.db.models import Q
from apps.supplier.models import Supplier, PurchaseOrder, SalesOrder
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_supplier(
    name: str = None,
    contact_person: str = None,
    email: str = None,
    mobile_number: str = None,
    gst_number: str = None,
    address: str = None,
) -> dict:
    """
    Opens the Add Supplier (Vendor) form on the frontend.
    Provide pre-fill information (name, contact_person, email, mobile_number, gst_number, address) from user intent to auto-populate the form.
    """
    return make_panel_trigger(
        "add_supplier",
        name=name,
        contact_person=contact_person,
        email=email,
        mobile_number=mobile_number,
        gst_number=gst_number,
        address=address
    )

async def trigger_edit_supplier(id: int) -> dict:
    """Opens the Edit Supplier form for the given supplier ID. Call this after finding the ID using search_suppliers."""
    return await verify_and_trigger_edit(Supplier, id, "edit_supplier", "Supplier")

async def search_suppliers(query: str = "") -> List[Dict[str, Any]]:
    """
    Searches for suppliers by name, contact person, mobile number, or GST number.
    Returns a list of matching suppliers with their IDs.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    def get_matching_suppliers():
        qs = Supplier.objects.filter(business_id=ctx.get("business_id"))
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(contact_person__icontains=query) |
                Q(mobile_number__icontains=query) |
                Q(gst_number__icontains=query)
            )
        return list(qs.values("id", "name", "contact_person", "mobile_number", "gst_number"))

    return await sync_to_async(get_matching_suppliers)()

async def trigger_add_purchase_order(
    branch_id: int = None,
    supplier_id: int = None,
    notes: str = None,
) -> dict:
    """
    Opens the Add Purchase Order form on the frontend.
    Provide pre-fill information (branch_id, supplier_id, notes) from user intent to auto-populate the form.
    """
    return make_panel_trigger(
        "add_purchase_order",
        branch_id=branch_id,
        supplier_id=supplier_id,
        notes=notes
    )

async def trigger_edit_purchase_order(id: int) -> dict:
    """Opens the Edit Purchase Order form for the given purchase order ID. Call this after finding the ID using search_purchase_orders."""
    return await verify_and_trigger_edit(PurchaseOrder, id, "edit_purchase_order", "Purchase Order")

async def search_purchase_orders(query: str = "") -> List[Dict[str, Any]]:
    """
    Searches for purchase orders by supplier name or ID.
    Returns a list of matching purchase orders with their IDs, branch name, and total amount.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    def get_matching_purchase_orders():
        qs = PurchaseOrder.objects.filter(business_id=ctx.get("business_id"))
        if query:
            qs = qs.filter(
                Q(id__icontains=query) |
                Q(supplier__name__icontains=query) |
                Q(notes__icontains=query)
            )
        return [
            {
                "id": po.id,
                "branch_id": po.branch_id,
                "branch_name": po.branch.branch_name if po.branch else None,
                "supplier_id": po.supplier_id,
                "supplier_name": po.supplier.name,
                "total_amount": float(po.total_amount),
                "status": po.status,
            }
            for po in qs.select_related("branch", "supplier")[:20]
        ]

    return await sync_to_async(get_matching_purchase_orders)()

async def trigger_add_sales_order(
    branch_id: int = None,
    customer_id: int = None,
    notes: str = None,
) -> dict:
    """
    Opens the Add Sales Order form on the frontend.
    Provide pre-fill information (branch_id, customer_id, notes) from user intent to auto-populate the form.
    """
    return make_panel_trigger(
        "add_sales_order",
        branch_id=branch_id,
        customer_id=customer_id,
        notes=notes
    )

async def trigger_edit_sales_order(id: int) -> dict:
    """Opens the Edit Sales Order form for the given sales order ID. Call this after finding the ID using search_sales_orders."""
    return await verify_and_trigger_edit(SalesOrder, id, "edit_sales_order", "Sales Order")

async def search_sales_orders(query: str = "") -> List[Dict[str, Any]]:
    """
    Searches for sales orders by customer name or ID.
    Returns a list of matching sales orders with their IDs, customer name, and total amount.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    def get_matching_sales_orders():
        qs = SalesOrder.objects.filter(business_id=ctx.get("business_id"))
        if query:
            qs = qs.filter(
                Q(id__icontains=query) |
                Q(customer__name__icontains=query) |
                Q(notes__icontains=query)
            )
        return [
            {
                "id": so.id,
                "branch_id": so.branch_id,
                "branch_name": so.branch.branch_name if so.branch else None,
                "customer_id": so.customer_id,
                "customer_name": so.customer.name if so.customer else None,
                "total_amount": float(so.total_amount),
                "status": so.status,
            }
            for so in qs.select_related("branch", "customer")[:20]
        ]

    return await sync_to_async(get_matching_sales_orders)()
