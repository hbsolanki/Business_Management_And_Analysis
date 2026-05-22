import asyncio
import re
import logging
from typing import Any, Dict, List, Optional
from django.db import connection
from channels.db import database_sync_to_async
from apps.ai_agent.utils.db.context import _serialize, ISOLATION_RULES

logger = logging.getLogger(__name__)


@database_sync_to_async
def _execute_sql_sync(sql: str) -> List[Dict[str, Any]]:
    """Internal sync function to execute a single SQL query."""
    with connection.cursor() as cur:
        cur.execute(sql)
        if not cur.description:
            return []
        cols = [d[0] for d in cur.description]
        return [
            {k: _serialize(v) for k, v in zip(cols, row)}
            for row in cur.fetchall()
        ]


async def _check_security(sql: str, ctx: Dict[str, Any]) -> None:
    """Perform exploit validation / final security check on the SQL string."""
    sql_clean = sql.strip().lower()
    
    if not sql_clean.startswith("select"):
        raise ValueError("Only SELECT queries are allowed.")

    tables_found = set(re.findall(r'\b(bma_[a-zA-Z0-9_]+)\b', sql_clean))
    if not tables_found:
        raise ValueError("Security Exploit Detected: Unauthorized table access pattern.")

    biz_id = str(ctx["business_id"])
    u_id = str(ctx["user_id"])
    
    for table in tables_found:
        # 1. Check Business Isolation
        if table in ISOLATION_RULES["filter_by_business"]:
            if "business_id" not in sql_clean or biz_id not in sql_clean:
                 raise ValueError(f"Security Exploit Detected: Mandatory business isolation missing for {table}.")
        
        # 2. Check User Isolation
        if table in ISOLATION_RULES["filter_by_user"]:
            if "user_id" not in sql_clean or u_id not in sql_clean:
                 raise ValueError(f"Security Exploit Detected: Mandatory user isolation missing for {table}.")
        
        # 3. Check Subquery/FK Isolation
        if table in ISOLATION_RULES["subquery_filters"]:
            rule_text = ISOLATION_RULES["subquery_filters"][table].lower()
            core_id = rule_text.split("in")[0].strip()
            if core_id not in sql_clean:
                 raise ValueError(f"Security Exploit Detected: Mandatory complex isolation missing for {table}.")


async def query_execute_tool(
    query_input_list: List,
    session_id: Optional[str] = None,
) -> List[List[Dict[str, Any]]]:
    """
    Execute a batch of PostgreSQL queries concurrently.
    Accepts a list of SQL strings and returns a list of result sets.
    """
    if not query_input_list:
        return []

    # 1. Context Check (Embedded logic)
    from apps.ai_agent.utils.context import current_user_context
    ctx_raw = current_user_context.get()
    if not ctx_raw:
        raise ValueError("No security context found. Access denied.")
    
    ctx = {
        "role":        ctx_raw.get("role"),
        "business_id": ctx_raw.get("business_id"),
        "branch_id":   ctx_raw.get("branch_id"),
        "user_id":     ctx_raw.get("user_id"),
    }

    final_queries: List[str] = []
    for item in query_input_list:
        raw = item.get("sql") if isinstance(item, dict) else str(item)
        if not raw:
            continue
        
        # Final safety/exploit check
        await _check_security(raw, ctx)
        final_queries.append(raw)

    if not final_queries:
        return []

    # 2. Execute all queries in parallel
    tasks = [_execute_sql_sync(q) for q in final_queries]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    results: List[List[Dict[str, Any]]] = []
    for q_idx, resp in enumerate(responses):
        if isinstance(resp, Exception):
            logger.error(f"query_execute_tool: query {q_idx} failed: {resp}")
            results.append([{"error": f"Execution Error: {str(resp)[:200]}"}])
        else:
            logger.info(f"query_execute_tool: query {q_idx} succeeded with {len(resp)} rows")
            # Truncate to 100 rows to prevent LLM context bloat
            results.append(resp[:100] + [{"_meta": "truncated"}] if len(resp) > 100 else resp)

    return results
