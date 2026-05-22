from decimal import Decimal
from typing import Any
import logging
from django.db import connection
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

# Mandatory Business/User Isolation Rules for Row Level Security (RLS)
ISOLATION_RULES = {
    "filter_by_business": [
        "bma_activity_log", "bma_branch", "bma_business", "bma_cost_category",
        "bma_customer", "bma_inventory", "bma_invoice", "bma_monthly_financial_summary",
        "bma_product", "bma_product_category", "bma_purchase_order", "bma_subscription",
        "bma_supplier", "bma_user"
    ],
    "filter_by_user": [
        "bma_broadcast_group", "bma_notification", "bma_conversation", "bma_task"
    ],
    "subquery_filters": {
        "bma_broadcast_group_member": "broadcast_group_id IN (SELECT id FROM bma_broadcast_group WHERE user_id = '{user_id}')",
        "bma_inventory_product": "inventory_id IN (SELECT id FROM bma_inventory WHERE business_id = '{business_id}')",
        "bma_inventory_transaction": "inventory_id IN (SELECT id FROM bma_inventory WHERE business_id = '{business_id}')",
        "bma_inventory_transaction_item": "transaction_id IN (SELECT id FROM bma_inventory_transaction WHERE inventory_id IN (SELECT id FROM bma_inventory WHERE business_id = '{business_id}'))",
        "bma_monthly_cost_category": "monthly_summary_id IN (SELECT id FROM bma_monthly_financial_summary WHERE business_id = '{business_id}')",
        "bma_monthly_product_performance": "monthly_summary_id IN (SELECT id FROM bma_monthly_financial_summary WHERE business_id = '{business_id}')",
        "bma_plan_usage": "subscription_id IN (SELECT id FROM bma_subscription WHERE business_id = '{business_id}')",
        "bma_po_item": "purchase_order_id IN (SELECT id FROM bma_purchase_order WHERE business_id = '{business_id}')",
        "bma_product_invoice": "invoice_id IN (SELECT id FROM bma_invoice WHERE business_id = '{business_id}')"
    }
}

def _serialize(value: Any) -> Any:
    """Convert database-specific types (Decimal, datetime) to JSON-safe types."""
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


_SCHEMA_CACHE = None

@database_sync_to_async
def _fetch_db_schema_sync():
    """Internal sync function to fetch schema from information_schema."""
    with connection.cursor() as cur:
        cur.execute(
            "SELECT table_name, column_name "
            "FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name LIKE 'bma_%' "
            "ORDER BY table_name;"
        )
        schema: dict = {}
        for table, column in cur.fetchall():
            schema.setdefault(table, []).append(column)
        return schema

async def get_db_schema() -> dict:
    """
    Return columns grouped by table name for all authorized bma_ tables.
    Shared utility for tools and validators.
    """
    global _SCHEMA_CACHE
    if _SCHEMA_CACHE is not None:
        return _SCHEMA_CACHE
    
    try:
        _SCHEMA_CACHE = await _fetch_db_schema_sync()
        return _SCHEMA_CACHE
    except Exception as e:
        logger.error(f"Error in get_db_schema: {e}", exc_info=True)
        return {}
