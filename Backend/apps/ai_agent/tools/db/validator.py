import re
import logging
from typing import Dict, Any, List, Union
from apps.ai_agent.tools.db.context import get_db_schema

logger = logging.getLogger(__name__)

ALLOWED_FILTER_OPS = {"=", "!=", ">", "<", ">=", "<=", "LIKE", "IN", "IS NOT NULL", "IS NULL"}
MAX_LIMIT = 1000

_AGGREGATE_RE = re.compile(
    r'^\s*(COUNT|SUM|AVG|MAX|MIN|RAW|DISTINCT|ARRAY_AGG)\s*\(',
    re.IGNORECASE
)

def _is_aggregate(col: Union[str, Dict]) -> bool:
    if isinstance(col, dict):
        col_str = col.get("field", "")
    else:
        col_str = str(col)
    
    base = re.split(r'\s+AS\s+', col_str, flags=re.IGNORECASE)[0].strip()
    return bool(_AGGREGATE_RE.match(base))


class IntentValidator:
    """
    Security & Schema Validator.
    Ensures table/column existence and applies strict security filtering.
    """

    @staticmethod
    def validate(*, generated_intent: Dict[str, Any]) -> Dict[str, Any]:
        schema_meta = get_db_schema()
        allowed_tables = set(schema_meta.keys())

        # ── 1. Table Resolution ───────────────────────────────────────────
        table_raw = (generated_intent.get("base_table") or generated_intent.get("table", "")).lower()
        table = table_raw.split(".")[-1] if "." in table_raw else table_raw
        
        if not table or table not in allowed_tables:
            logger.warning("Blocked: unauthorized/missing table '%s'", table)
            return {"error": f"Access denied: table '{table}' is not allowed or missing."}

        generated_intent["base_table"] = table

        # ── 2. Column Validation ──────────────────────────────────────────
        columns = generated_intent.get("columns", [])
        if not columns:
            columns = [{"field": "*"}]
        
        sanitized_cols = []
        for col in columns:
            if isinstance(col, dict):
                field = col.get("field", "").lower()
                # Auto-prefix if it's a known column and not already prefixed
                if "." not in field and not _is_aggregate(field) and field != "*":
                    if field in schema_meta.get(table, []):
                        col["field"] = f"{table}.{field}"
                sanitized_cols.append(col)
            else:
                # String format
                if _is_aggregate(col) or col == "*":
                    sanitized_cols.append({"field": col})
                else:
                    col_full = col if "." in col else f"{table}.{col}"
                    sanitized_cols.append({"field": col_full})
        
        generated_intent["columns"] = sanitized_cols

        # ── 3. Filters & Having ───────────────────────────────────────────
        for section in ["filters", "having"]:
            conds = generated_intent.get(section, [])
            if not conds: continue
            
            if isinstance(conds, list):
                valid_conds = []
                for f in conds:
                    if isinstance(f, dict):
                        field = f.get("field", "")
                        if not field: continue
                        if "." not in field and not _is_aggregate(field): 
                            f["field"] = f"{table}.{field}"
                        
                        op = (f.get("operator") or f.get("op", "=")).upper()
                        if op in ALLOWED_FILTER_OPS:
                            f["operator"] = op
                            valid_conds.append(f)
                
                generated_intent[section] = valid_conds

        # ── 4. Joins ──────────────────────────────────────────────────────
        joins = generated_intent.get("joins", [])
        valid_joins = []
        for join in joins:
            j_table_raw = join.get("table", "").lower()
            j_table = j_table_raw.split(".")[-1] if "." in j_table_raw else j_table_raw
            
            if j_table in allowed_tables:
                join["table"] = j_table
                valid_joins.append(join)
            else:
                logger.warning("Auto-Filtering: Removing invalid JOIN to '%s'", j_table)
        generated_intent["joins"] = valid_joins

        # ── 5. Limit ──────────────────────────────────────────────────────
        limit = generated_intent.get("limit", 50)
        try:
            generated_intent["limit"] = min(int(limit), MAX_LIMIT)
        except:
            generated_intent["limit"] = 50
            
        return generated_intent
