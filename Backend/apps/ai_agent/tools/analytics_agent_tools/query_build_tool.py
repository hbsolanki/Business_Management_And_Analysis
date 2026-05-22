import asyncio
import logging
from typing import Any, Dict, List, Optional
from apps.ai_agent.utils.db.context import ISOLATION_RULES
from apps.ai_agent.utils.db.validator import IntentValidator

logger = logging.getLogger(__name__)


async def _build_one(
    blueprint: Dict[str, Any],
    ctx: Dict[str, Any]
) -> str:
    """Run the full pipeline for a single PostgreSQL query blueprint."""
    print(blueprint)
    # 1. Normalize & Validate (IntentValidator handles both)
    validated_intent = await IntentValidator.validate(generated_intent=blueprint)
    if "error" in validated_intent:
        raise ValueError(validated_intent["error"])

    q = validated_intent
    role = ctx["role"]
    biz_id = ctx["business_id"]
    user_id = ctx["user_id"]
    branch_id = ctx["branch_id"]
    base_table = q["base_table"]

    # 2. Build SQL Clauses
    select_clause = ", ".join([
        f"{c['field']}{' AS ' + c['alias'] if c.get('alias') else ''}" 
        for c in q["columns"]
    ])
    sql = f"SELECT {select_clause} FROM {base_table}"
    
    joins = q.get("joins", [])
    for j in joins:
        sql += f" {j.get('type', 'INNER')} JOIN {j['table']}{' AS ' + j['alias'] if j.get('alias') else ''} ON {j['on']['left']} = {j['on']['right']}"

    # 3. Security (RLS Enforcement)
    security_filters = []
    
    def add_security(table_name, alias=None):
        prefix = f"{alias}." if alias else ""
        if table_name in ISOLATION_RULES["filter_by_business"]:
            security_filters.append(f"{prefix}business_id = '{biz_id}'")
            if role == "MANAGER" and branch_id:
                 security_filters.append(f"{prefix}branch_id = '{branch_id}'")
        
        elif table_name in ISOLATION_RULES["filter_by_user"]:
            if table_name == "bma_conversation":
                security_filters.append(f"({prefix}user1_id = '{user_id}' OR {prefix}user2_id = '{user_id}')")
            elif table_name == "bma_task":
                security_filters.append(f"({prefix}assigned_by_id = '{user_id}' OR {prefix}assignee_id = '{user_id}')")
            else:
                security_filters.append(f"{prefix}user_id = '{user_id}'")
        
        elif table_name in ISOLATION_RULES["subquery_filters"]:
            raw_filter = ISOLATION_RULES["subquery_filters"][table_name]
            security_filters.append(raw_filter.format(business_id=biz_id, user_id=user_id))

    add_security(base_table)
    for j in joins:
        add_security(j["table"], j.get("alias"))

    # 4. User Filters & Compilation
    user_filters = []
    for f in q.get("filters", []):
        val = f['value']
        if isinstance(val, str):
            val = f"'{val}'"
        elif isinstance(val, list):
            val = "(" + ", ".join([f"'{v}'" if isinstance(v, str) else str(v) for v in val]) + ")"
        user_filters.append(f"{f['field']} {f['operator']} {val}")

    all_filters = security_filters + user_filters
    if all_filters:
        sql += " WHERE " + " AND ".join(all_filters)

    if q.get("group_by"):
        sql += " GROUP BY " + ", ".join(q["group_by"])

    if q.get("having"):
        h_clauses = [f"{h['field']} {h['operator']} {h['value']}" for h in q["having"]]
        sql += " HAVING " + " AND ".join(h_clauses)

    if q.get("order_by"):
        o_clauses = [f"{o['field']} {o.get('direction', 'ASC').upper()}" for o in q["order_by"]]
        sql += " ORDER BY " + ", ".join(o_clauses)

    sql += f" LIMIT {q['limit']}"
    return sql


async def query_build_tool(
    query_json_list: List,
    session_id: Optional[str] = None,
) -> List[str]:
    """
    Transform a list of LLM query blueprints into secured PostgreSQL strings.
    Each blueprint is a JSON object describing the query structure.
    """
    if not query_json_list:
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

    # 2. Detect raw SQL (Legacy/Direct Support)
    raw_queries = []
    blueprints = []
    for item in query_json_list:
        if isinstance(item, dict) and "sql" in item and len(item) == 1:
            raw_queries.append(item["sql"])
        elif isinstance(item, str):
            raw_queries.append(item)
        else:
            blueprints.append(item)

    if raw_queries and not blueprints:
        return raw_queries

    # 3. Parallel Build Pipeline
    tasks = [_build_one(bp, ctx) for bp in blueprints]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    queries: List[str] = []
    for r in results:
        if isinstance(r, Exception):
            raise r
        queries.append(r)
    
    print(queries)
    return queries + raw_queries
