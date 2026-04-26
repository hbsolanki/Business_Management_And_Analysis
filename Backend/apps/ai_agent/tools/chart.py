import re
import logging
import json
import uuid
from typing import Union, Dict, Any, List
from asgiref.sync import sync_to_async
from django.db import transaction

from apps.ai_agent.tools.apache_echarts import CHART_BUILDERS, SUPPORTED_CHART_TYPES
from apps.ai_agent.tools.apache_echarts.shared import wrap_iframe
from apps.ai_agent.tools.db.executor import execute_query

logger = logging.getLogger(__name__)

async def fetch_chart_data(
    queries: List[str] = None, 
) -> List[Dict[str, Any]]:
    """Fetch and normalize data using the unified execution tool."""
    parsed_results = []
    
    if queries:
        for idx, q in enumerate(queries):
            # Direct execution of the query string provided by the Agent
            if isinstance(q, str):
                # execute_query is sync, so we wrap it
                result = await sync_to_async(execute_query)(q)
            else:
                result = []
                
            if not isinstance(result, list) or not result:
                logger.warning(f"Chart query {idx+1} failed or returned empty: {q}")
                continue
            
            # Error check in result
            if len(result) > 0 and isinstance(result[0], dict) and "error" in result[0]:
                logger.error(f"SQL Error in chart query: {result[0]['error']}")
                continue

            # Auto-tag series for multi-query requests
            if len(queries) > 1:
                series_label = f"Dataset {idx + 1}"
                for row in result:
                    if isinstance(row, dict):
                        row.setdefault("series", series_label)
            
            parsed_results.extend(result)
            
    return parsed_results


async def generate_chart(
    chart_type: str,
    queries: List[str] = None,
    sql: str = None,  # Support single SQL as well
    title: str = "Visualization",
    description: str = "",
    **kwargs
) -> Dict[str, Any]:
    """
    Generate an interactive chart using Apache ECharts.
    Includes a subscription entitlement check for Advanced Analytics.
    """
    try:
        from apps.ai_agent.tools.db.context import get_user_context
        from apps.subscription.utils.entitlements import can_use_feature
        from apps.business.models import Business
        from asgiref.sync import sync_to_async

        # 1. Entitlement Check
        ctx = get_user_context()
        if "error" in ctx: return ctx
        
        biz_id = ctx.get("business_id")
        business = await sync_to_async(lambda: Business.objects.filter(id=biz_id).first())()
        
        if not business:
            return {"error": "Business context not found."}

        allowed, message = await sync_to_async(can_use_feature)(business, "has_advanced_analytics")
        if not allowed:
            return {
                "result": (
                    "I understand you're looking for a visual representation. "
                    "The **Advanced Analytics** feature—which powers these interactive charts—is "
                    "not currently enabled on your subscription plan.\n\n"
                    "I have provided the analytical data in the table below. To unlock premium "
                    "visualizations, please check your account dashboard for upgrade options."
                )
            }

        # 2. Data Fetching
        if sql and not queries:
            queries = [sql]
            
        parsed_data = await fetch_chart_data(queries=queries)

        if not parsed_data:
            return {"error": "No data available to generate chart. Check your queries."}

        # 3. Chart Building
        normalized_type = re.sub(r"[^a-z0-9]+", "_", (chart_type or "column").strip().lower()).strip("_")
        builder = CHART_BUILDERS.get(normalized_type, CHART_BUILDERS.get("column"))
        
        if not builder:
             builder = CHART_BUILDERS.get("bar")

        html = builder(parsed_data, title, description)
        final_html = wrap_iframe(html)

        # 4. Save Reference
        from apps.ai_agent.agent import current_message_id
        from apps.ai_agent.models import AiChartRef
        msg_id = current_message_id.get()

        if msg_id:
            chart_ref = await sync_to_async(lambda: AiChartRef.objects.create(message_id=msg_id, html=final_html))()
            return {
                "result": f"<ChartRef:{chart_ref.id}>",
                "id": str(chart_ref.id),
                "html": final_html
            }

        return {
            "result": final_html,
            "html": final_html,
            "parsed_data": parsed_data
        }
    except Exception as error:
        logger.exception("Chart generation failed")
        supported = ", ".join(sorted(SUPPORTED_CHART_TYPES))
        return {
            "error": f"Chart generation failed: {str(error)}",
            "supported_types": supported
        }