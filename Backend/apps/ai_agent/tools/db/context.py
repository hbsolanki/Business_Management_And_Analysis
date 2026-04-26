from django.db import connection
from functools import lru_cache
from decimal import Decimal
from typing import Any

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
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def get_user_context() -> dict:
    """Return the current user's security context (role, business_id, branch_id, user_id)."""
    from apps.ai_agent.agent import current_user_context
    ctx = current_user_context.get()
    if not ctx:
        return {"error": "No security context found. Access denied."}
    return {
        "role":        ctx.get("role"),
        "business_id": ctx.get("business_id"),
        "branch_id":   ctx.get("branch_id"),
        "user_id":     ctx.get("user_id"),
    }

@lru_cache(maxsize=1)
def get_db_schema() -> dict:
    """
    Return columns grouped by table name for all bma_ tables.
    Cached for production efficiency.
    """
    try:
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
    except Exception:
        return {}
