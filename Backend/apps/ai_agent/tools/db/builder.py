import json
from typing import Any
from apps.ai_agent.tools.db.context import get_user_context, ISOLATION_RULES
from apps.ai_agent.tools.db.validator import IntentValidator

def build_query(query_def: Any) -> dict:
    """
    Step 4: SQL Generation.
    Validates intent via IntentValidator and injects mandatory security filters.
    """
    try:
        if isinstance(query_def, str):
            intent = json.loads(query_def)
        else:
            intent = query_def

        # 1. Validate Intent (Schema & Security Check)
        validated_intent = IntentValidator.validate(generated_intent=intent)
        if "error" in validated_intent:
            return validated_intent

        q = validated_intent

        # 2. Get User Context
        ctx = get_user_context()
        if "error" in ctx:
            return ctx

        role = ctx["role"]
        biz_id = ctx["business_id"]
        user_id = ctx["user_id"]
        branch_id = ctx["branch_id"]

        base_table = q["base_table"]

        # 3. Build SQL Parts
        select_clause = ", ".join([
            f"{c['field']}{' AS ' + c['alias'] if c.get('alias') else ''}" 
            for c in q["columns"]
        ])

        sql = f"SELECT {select_clause} FROM {base_table}"
        
        joins = q.get("joins", [])
        for j in joins:
            sql += f" {j.get('type', 'INNER')} JOIN {j['table']}{' AS ' + j['alias'] if j.get('alias') else ''} ON {j['on']['left']} = {j['on']['right']}"

        # 4. Mandatory Security Filters
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

        # 5. Combine with User Filters
        user_filters = []
        for f in q.get("filters", []):
            val = f['value']
            if isinstance(val, str): val = f"'{val}'"
            elif isinstance(val, list): val = "(" + ", ".join([f"'{v}'" if isinstance(v, str) else str(v) for v in val]) + ")"
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

        return {"sql": sql}

    except Exception as e:
        return {"error": f"Query builder failed: {str(e)}"}
