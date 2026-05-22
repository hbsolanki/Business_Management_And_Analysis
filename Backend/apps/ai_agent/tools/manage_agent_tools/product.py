import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from apps.product.models import Product
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_product(
    name: str = None, 
    sku: str = None, 
    cost_price: str = None, 
    base_price: str = None, 
    input_gst_rate: str = None, 
    output_gst_rate: str = None, 
    low_stock_limit: str = None, 
    description: str = None
) -> dict:
    """
    Opens the Add Product form on the frontend.
    Provide pre-fill information (name, sku, cost_price, base_price, input_gst_rate, output_gst_rate, low_stock_limit, description) from the user's intent to pre-populate the form.
    """
    return make_panel_trigger(
        "add_product",
        name=name,
        sku=sku,
        cost_price=cost_price,
        base_price=base_price,
        input_gst_rate=input_gst_rate,
        output_gst_rate=output_gst_rate,
        low_stock_limit=low_stock_limit,
        description=description
    )

async def trigger_edit_product(id: int) -> dict:
    """Opens the Edit Product form for the given product ID. Call this after finding the product ID via search_products."""
    return await verify_and_trigger_edit(Product, id, "edit_product", "Product")

async def search_products(query: str) -> List[Dict[str, Any]]:
    """
    Search for products by name or SKU.
    Use this to find product IDs for editing.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    raw = await sync_to_async(list)(
        Product.objects.filter(
            business_id=ctx.get("business_id"),
            name__icontains=query
        ).values("id", "name", "sku", "base_price")[:10]
    )
    # Decimal is not JSON serializable — convert to float
    return [
        {**item, "base_price": float(item["base_price"])}
        for item in raw
    ]
