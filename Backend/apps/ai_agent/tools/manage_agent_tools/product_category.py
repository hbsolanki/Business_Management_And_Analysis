import logging
from typing import Any, Dict, List
from asgiref.sync import sync_to_async
from apps.product.models import ProductCategory
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.utils.panel_helper import make_panel_trigger, verify_and_trigger_edit

logger = logging.getLogger(__name__)

async def trigger_add_product_category(name: str = None, description: str = None) -> dict:
    """
    Opens the Add Product Category form on the frontend.
    Provide 'name' and 'description' to pre-fill the form automatically if specified by the user.
    """
    return make_panel_trigger(
        "add_product_category",
        name=name,
        description=description
    )

async def trigger_edit_product_category(id: int) -> dict:
    """Opens the Edit Product Category form for the given category ID. Call this after finding the category ID via search_product_categories."""
    return await verify_and_trigger_edit(ProductCategory, id, "edit_product_category", "Product Category")

async def search_product_categories(query: str) -> List[Dict[str, Any]]:
    """
    Search for product categories by name.
    Use this to find product category IDs for editing.
    """
    ctx = current_user_context.get()
    if not ctx:
        return []

    raw = await sync_to_async(list)(
        ProductCategory.objects.filter(
            business_id=ctx.get("business_id"),
            name__icontains=query
        ).values("id", "name", "description")[:10]
    )
    return raw
