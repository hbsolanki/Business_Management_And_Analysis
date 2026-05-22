import re
import logging
import json
import asyncio
from typing import Dict, Any, List

from google.genai import Client, types
from bma.config.variable import env

from apps.ai_agent.tools.analytics_agent_tools.query_execute_tool import query_execute_tool

logger = logging.getLogger(__name__)

# --- Chart Planner Config (Inlined) ---

GOOGLE_API_KEY = env("GOOGLE_API_KEY")
_client = Client(api_key=GOOGLE_API_KEY)
_CHART_PLANNER_MODEL = "models/gemini-3.1-flash-lite-preview"

CHART_INTENT_INSTRUCTION = """
Use the following scenario categories to select the optimal visualization:

Choose chart types from these families:

Trend Rules:
- line_chart: 1 numeric metric over a continuous time/sequence axis. Best for high-density (>10 points).
- area_chart: Time axis; use when accumulation or total volume is the focus.
- multi_line: Compare 3-5 entities over a common time axis.
- kpi_sparkline: Summary aggregate with a minimalist trend shape; no axes shown.

Comparison Rules:
- vertical_bar: Discrete categories; best for ≤10 items with short labels.
- horizontal_bar: Best for long category labels or rankings (leaderboards).
- grouped_bar: 2-3 related metrics compared side-by-side across categories.
- stacked_bar: Shows the total while visualizing internal segment breakdown.
- combo_bar_line: Volume (bar) vs Rate/Threshold (line). Requires dual Y-axis.
- radar: Multi-variable scorecard; 3-7 metrics for 1-3 entities.

Composition Rules:
- pie_chart: Part-of-whole with 2-5 categories; strictly no time axis.
- donut_chart: Part-of-whole with ≤6 categories; no time axis; supports center KPI.
- treemap: High-category count (>10) or hierarchical grouping (e.g., Country > City).

Funnel Rules:
- funnel_chart: 4-6 sequential stages with naturally decreasing values.

Matrix Rules:
- heatmap: Identify high/low density patterns across 2 categorical dimensions.
- scatter: Visualize correlation between 2 numeric metrics.
- bubble: Adds a 3rd numeric dimension via bubble size to a scatter plot.

Attainment Rules:
- gauge: Single percentage vs a target (0-100%).
- bullet: Operational progress vs target with qualitative ranges.

Summary KPI Rules:
- kpi_sparkline: Big number summary (SUM/AVG) with minimalist historical trend.

Fallback type rules:
- stacked_bar -> vertical_bar (If no breakdown)
- grouped_bar -> vertical_bar (If single metric)
- multi_line -> line_chart (If single series)
- area_chart -> line_chart (If area styling fails)
- donut_chart -> pie_chart (Standard part-to-whole)
- bubble -> scatter (If size dimension is missing)
- combo_bar_line -> vertical_bar (If line metric is missing)
- radar -> grouped_bar (If too complex)
- treemap -> horizontal_bar (If hierarchy is flat)
- gauge -> kpi_sparkline (If target is missing)

Annotation rules:
- If the question asks to highlight the best, worst, peak, breach, or outlier, attach it as an annotation on the primary chart.
- Do not create a separate intent for annotations.

Data shape hint rules:
- Return "long" when the question implies one numeric metric broken down by a categorical dimension.
- Return "wide" when the question implies multiple named metrics side by side.
- Default to "wide" when unclear.
"""

_RESPONSE_SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(
        type=types.Type.OBJECT,
        required=["index", "chart_type", "queries", "label_key", "value_keys", "title", "description", "data_shape"],
        properties={
            "index":       types.Schema(type=types.Type.INTEGER, description="Sequential ID starting from 1"),
            "chart_type":  types.Schema(
                type=types.Type.STRING,
                enum=[
                    "vertical_bar", "horizontal_bar", "grouped_bar", "stacked_bar",
                    "line_chart", "area_chart", "multi_line", "combo_bar_line",
                    "pie_chart", "donut_chart", "treemap", "funnel",
                    "heatmap", "scatter", "bubble", "radar",
                    "gauge", "bullet", "kpi_sparkline",
                ],
            ),
            "queries":     types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Exact SQL strings from input — MUST copy them verbatim"),
            "label_key":   types.Schema(type=types.Type.STRING, description="Categorical field name from query result"),
            "value_keys":  types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Numeric field names from query result"),
            "join_key":    types.Schema(type=types.Type.STRING, description="Common field name for multi-query merging (e.g. month)"),
            "data_shape":  types.Schema(type=types.Type.STRING, enum=["long", "wide"], description="Merging strategy: 'long' for single-metric split, 'wide' for multi-metric comparison"),
            "title":       types.Schema(type=types.Type.STRING, description="Professional chart title"),
            "description": types.Schema(type=types.Type.STRING, description="One-line analytical insight"),
            "annotations": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Specific callouts for peaks, outliers, or breaches"),
            "is_cumulative": types.Schema(type=types.Type.BOOLEAN, description="Set to true for 'Growth', 'Trend over time', or 'Cumulative' requests to enable running totals."),
        },
    ),
)

_SYSTEM_PROMPT = (
    "You are a professional data visualization architect. Your goal is to map user queries and data to the perfect chart type.\n"
    f"{CHART_INTENT_INSTRUCTION}\n"
    "CRITICAL RULES:\n"
    "1. You MUST copy the SQL queries EXACTLY as provided into the 'queries' field — do not modify them.\n"
    "2. Every intent MUST have a non-empty 'queries' array.\n"
    "3. Return the chart plan as a JSON array. Ensure label_key and value_keys match actual field names returned by the queries.\n"
    "4. For multi-series charts (like multi_line), use 'data_shape': 'long' if the query results are grouped by a category column. Ensure the grouping column is aliased as 'series'.\n"
    "5. If multiple charts are logically required, generate them as separate items in the array."
)

def _extract_json(raw: str) -> str:
    if not raw:
        return "[]"
    text = re.sub(r"```(?:json)?", "", raw).strip()
    for open_ch, close_ch in (("[", "]"), ("{", "}")):
        start = text.find(open_ch)
        if start == -1:
            continue
        depth = 0
        end = -1
        for i, ch in enumerate(text[start:], start=start):
            if ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end != -1:
            extracted = text[start : end + 1]
            if open_ch == "{":
                extracted = f"[{extracted}]"
            return extracted
    return text

async def chart_intent_planner(user_query: str, sql_queries: List[str]) -> List[Dict[str, Any]]:
    if not sql_queries:
        return []
    user_msg = f"USER QUERY: {user_query}\nSQL QUERIES:\n" + "\n".join(f"  - {q}" for q in sql_queries)
    intents = []
    last_error = None
    for attempt in range(3):
        try:
            response = await _client.aio.models.generate_content(
                model=_CHART_PLANNER_MODEL,
                contents=[types.Content(role="user", parts=[types.Part(text=f"{_SYSTEM_PROMPT}\n\n{user_msg}")])],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_RESPONSE_SCHEMA,
                    temperature=0,
                    max_output_tokens=2000,
                ),
            )
            raw = response.text or "[]"
            parsed = json.loads(_extract_json(raw))
            intents = parsed if isinstance(parsed, list) else [parsed]
            last_error = None
            break
        except Exception as e:
            last_error = e
            if any(code in str(e) for code in ["500", "503", "429", "Internal error", "UNAVAILABLE"]):
                await asyncio.sleep((2 ** attempt) + 1)
                continue
            break
    if last_error:
        logger.error(f"Chart Planner failed: {last_error}")
        return []
    return intents

# --- Core Tool Logic ---

async def fetch_chart_data(queries: List[str] = None) -> List[Dict[str, Any]]:
    if not queries:
        return []
    batch_results = await query_execute_tool(queries)
    parsed_results = []
    for idx, result in enumerate(batch_results):
        if not isinstance(result, list) or not result:
            continue
        if len(result) > 0 and isinstance(result[0], dict) and "error" in result[0]:
            continue
        if len(queries) > 1:
            series_label = f"Dataset {idx + 1}"
            for row in result:
                if isinstance(row, dict):
                    row.setdefault("series", series_label)
        parsed_results.extend(result)
    return parsed_results


async def chart_intent_tool(
    chart_type: str,
    queries: List[str] = None,
    sql: str = None,
    title: str = "Visualization",
    description: str = "",
    user_query: str = "",
    **kwargs
) -> Dict[str, Any]:
    """
    Generate an interactive Apache EChart visualization data.
    Provides structured JSON (data, title, labels, options) for frontend rendering.
    """
    try:
        from apps.subscription.utils.entitlements import can_use_feature
        from apps.business.models import Business
        from asgiref.sync import sync_to_async
        from apps.ai_agent.utils.context import current_user_context

        ctx_raw = current_user_context.get()
        if not ctx_raw:
            return {"error": "No security context found. Access denied."}
        
        biz_id = ctx_raw.get("business_id")
        business = await sync_to_async(lambda: Business.objects.filter(id=biz_id).first())()
        if not business:
            return {"error": "Business context not found."}

        allowed, message = await sync_to_async(can_use_feature)(business, "has_advanced_analytics")
        if not allowed:
            return {
                "result": (
                    "Advanced Analytics feature is not enabled on your plan. "
                    "I have provided the analytical data below."
                )
            }

        if sql and not queries:
            queries = [sql]
        parsed_data = await fetch_chart_data(queries=queries)
        if not parsed_data:
            return {"error": "No data available to generate chart."}

        planning_query = user_query if user_query else title
        intents = await chart_intent_planner(user_query=planning_query, sql_queries=queries)
        
        if not intents:
            intents = [{
                "chart_type": chart_type or "vertical_bar",
                "title": title,
                "description": description,
                "queries": queries,
                "label_key": None,
                "value_keys": None
            }]

        final_results = []
        from apps.ai_agent.utils.context import current_message_id
        from apps.ai_agent.models import AiChartRef
        msg_id = current_message_id.get()

        from apps.ai_agent.utils.charts.apache_echarts.shared import generic_normalize, normalize_multi_series, build_generic_config
        
        for intent in intents:
            c_type = intent.get("chart_type", "vertical_bar")
            c_title = intent.get("title", title)
            c_desc = intent.get("description", description)
            l_key = intent.get("label_key")
            v_keys = intent.get("value_keys")
            
            if intent.get("data_shape") == "long":
                labels, datasets = normalize_multi_series(parsed_data)
            else:
                labels, datasets = generic_normalize(parsed_data, l_key, v_keys)
            
            x_label = l_key.replace("_", " ").title() if l_key else "Category"
            y_label = ", ".join([vk.replace("_", " ").title() for vk in v_keys]) if v_keys else "Value"
            
            chart_config = build_generic_config(
                chart_type=c_type, 
                labels=labels, 
                datasets=datasets, 
                title=c_title,
                x_label=x_label,
                y_label=y_label
            )

            # --- SERIALIZER-LIKE STRUCTURE ---
            # This matches what AiChatMessageSerializer.get_content returns
            chart_data_payload = {
                "labels": labels,
                "datasets": datasets,
                "chart_type": c_type,
                "title": c_title,
                "description": c_desc,
                "x_label": x_label,
                "y_label": y_label,
                "option": chart_config
            }

            if msg_id:
                from apps.ai_agent.models import AiChatMessage
                await sync_to_async(lambda: AiChatMessage.objects.filter(id=msg_id).update(has_chart=True))()
                chart_ref = await sync_to_async(lambda: AiChartRef.objects.create(
                    message_id=msg_id, 
                    title=c_title,
                    chart_type=c_type,
                    data=chart_data_payload, # Store the whole thing
                    option=chart_config,
                    config=chart_data_payload
                ))()
                final_results.append({
                    "type": "chart",
                    "id": str(chart_ref.id),
                    "title": c_title,
                    "chart_type": c_type,
                    "option": chart_config,
                    "data": chart_data_payload,
                    "result": f"<ChartRef:{chart_ref.id}>" # For the LLM
                })
            else:
                final_results.append({
                    "type": "chart",
                    "title": c_title,
                    "chart_type": c_type,
                    "option": chart_config,
                    "data": chart_data_payload,
                    "result": chart_data_payload # For the LLM/Test
                })

        return final_results[0] if final_results else {"error": "Failed to generate chart results."}

    except Exception as error:
        logger.exception("Chart generation failed")
        return {"error": f"Chart generation failed: {str(error)}"}
