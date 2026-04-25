from django.db import connection
from apps.ai_agent.tools.db.context import _serialize, ISOLATION_RULES, get_user_context
import re

def execute_query(sql: str) -> list:
    """
    Step 5: SQL Execution.
    Executes a pre-built SQL query and returns results.
    Includes a final 'Exploit Validation' pairing check.
    Uses Django's managed connection for production scalability.
    """
    sql_clean = sql.strip().lower()
    if not sql_clean.startswith("select"):
        return [{"error": "Only SELECT queries are allowed."}]

    # Final Security Pairing Check (Exploit Validation)
    try:
        # Get tables mentioned in the query
        tables_found = set(re.findall(r'\b(bma_[a-zA-Z0-9_]+)\b', sql_clean))
        
        # If no bma_ tables found but it's a SELECT, it might be a system query or an attempt to bypass
        if not tables_found:
             return [{"error": "Security Exploit Detected: Unauthorized table access pattern."}]

        # Get current context for validation
        ctx = get_user_context()
        if "error" in ctx: return [ctx]
        
        biz_id = str(ctx["business_id"])
        u_id = str(ctx["user_id"])
        
        for table in tables_found:
            # 1. Check Business Isolation
            if table in ISOLATION_RULES["filter_by_business"]:
                if "business_id" not in sql_clean or biz_id not in sql_clean:
                     return [{"error": f"Security Exploit Detected: Mandatory business isolation missing for {table}."}]
            
            # 2. Check User Isolation
            if table in ISOLATION_RULES["filter_by_user"]:
                if "user_id" not in sql_clean or u_id not in sql_clean:
                     return [{"error": f"Security Exploit Detected: Mandatory user isolation missing for {table}."}]
            
            # 3. Check Subquery/FK Isolation
            if table in ISOLATION_RULES["subquery_filters"]:
                rule_text = ISOLATION_RULES["subquery_filters"][table].lower()
                core_id = rule_text.split("in")[0].strip()
                if core_id not in sql_clean:
                     return [{"error": f"Security Exploit Detected: Mandatory complex isolation missing for {table}."}]

    except Exception as se:
        return [{"error": f"Security Validation Error: {str(se)}"}]

    try:
        with connection.cursor() as cur:
            cur.execute(sql)
            if not cur.description:
                return []
            cols = [d[0] for d in cur.description]
            return [
                {k: _serialize(v) for k, v in zip(cols, row)}
                for row in cur.fetchall()
            ]
    except Exception as e:
        return [{"error": str(e)}]
