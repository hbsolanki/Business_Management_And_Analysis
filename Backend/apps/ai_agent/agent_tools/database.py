import psycopg2
from decimal import Decimal
from typing import Any
from bma.config.variable import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT


def _get_connection():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)


def _serialize(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def get_user_context() -> dict:
    """Return the current user's security context (role, business_id, branch_id)."""
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


def get_db_schema() -> dict:
    """Return columns grouped by table name for all bma_ tables."""
    conn = None
    try:
        conn = _get_connection()
        with conn.cursor() as cur:
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
    finally:
        if conn:
            conn.close()


def run_sql_query(query: str) -> list:
    """Execute a SELECT query and return rows as a list of dicts."""
    if not query.strip().lower().startswith("select"):
        return [{"error": "Only SELECT queries are allowed."}]
    conn = None
    try:
        conn = _get_connection()
        with conn.cursor() as cur:
            cur.execute(query)
            if not cur.description:
                return []
            cols = [d[0] for d in cur.description]
            return [
                {k: _serialize(v) for k, v in zip(cols, row)}
                for row in cur.fetchall()
            ]
    except Exception as e:
        return [{"error": str(e)}]
    finally:
        if conn:
            conn.close()
