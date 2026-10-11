import json
from html import escape
from typing import List, Dict, Any, Union, Tuple

ECHARTS_CDN = "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"
DEFAULT_IFRAME_HEIGHT = 450
MAX_IFRAME_HEIGHT = 1000

SHARED_CSS = """
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: transparent;
    color: #0f172a;
    padding: 12px 14px 10px;
  }
  .meta { margin-bottom: 12px; }
  .chart-title {
    font-size: 15px; font-weight: 500; color: #0f172a; margin-bottom: 3px;
  }
  .chart-desc { font-size: 12px; color: #64748b; }
  .chart-shell {
    width: 100%;
    max-width: 100%;
  }
  .chart-card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
"""

def to_number(v: Any) -> float:
    try:
        return float(v)
    except Exception:
        return 0.0

def is_numeric(v: Any) -> bool:
    try:
        float(v)
        return True
    except Exception:
        return False

def format_number(v: float) -> str:
    if v >= 1_000_000:
        return f"{v/1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v/1_000:.1f}k"
    return str(v)

def load_data(data: Union[str, List]) -> List:
    if isinstance(data, str):
        try:
            return json.loads(data)
        except Exception:
            return []
    return data if isinstance(data, list) else []

def normalize_single_series(data: List[Dict]) -> Tuple[List[str], List[float]]:
    if not data:
        return [], []
    keys = list(data[0].keys())
    xk, yk = keys[0], keys[1] if len(keys) > 1 else keys[0]
    labels = [str(row.get(xk, "N/A")) for row in data]
    values = [to_number(row.get(yk, 0)) for row in data]
    return labels, values

def generic_normalize(data: List[Dict], label_key: str, value_keys: List[str]) -> Tuple[List[str], List[Dict]]:
    if not data:
        return [], []
    
    # Fallback to first keys if not provided
    if not label_key or not value_keys:
        keys = list(data[0].keys())
        label_key = label_key or keys[0]
        if not value_keys:
            value_keys = [keys[1]] if len(keys) > 1 else [keys[0]]

    labels = []
    series_map = {vk: [] for vk in value_keys}
    
    for row in data:
        labels.append(str(row.get(label_key, "N/A")))
        for vk in value_keys:
            series_map[vk].append(to_number(row.get(vk, 0)))
            
    datasets = [
        {"label": vk.replace("_", " ").title(), "data": vals}
        for vk, vals in series_map.items()
    ]
    return labels, datasets

def normalize_multi_series(data: List[Dict]) -> Tuple[List[str], List[Dict]]:
    if not data:
        return [], []
    if isinstance(data, dict):
        if "data" in data and isinstance(data["data"], list):
            data = data["data"]
        else:
            return list(data.keys()), [to_number(v) for v in data.values()]
    if not data or not isinstance(data, list) or not isinstance(data[0], dict):
        return [], []
    series_map = {}
    labels = []
    label_set = set()
    
    # Expecting keys: category (or label), value, and series (optional)
    keys = list(data[0].keys())
    xk = keys[0]
    vk = keys[1] if len(keys) > 1 else keys[0]
    sk = "series" if "series" in data[0] else None
    
    for row in data:
        label = str(row.get(xk, "N/A"))
        if label not in label_set:
            labels.append(label)
            label_set.add(label)
        
        s_name = str(row.get(sk, "Value")) if sk else "Value"
        if s_name not in series_map:
            series_map[s_name] = []
        series_map[s_name].append(to_number(row.get(vk, 0)))
        
    datasets = [
        {"label": s_name, "data": s_values}
        for s_name, s_values in series_map.items()
    ]
    return labels, datasets

def _clamp_iframe_height(h: int) -> int:
    return max(100, min(h, MAX_IFRAME_HEIGHT))

def wrap_iframe(html: str) -> str:
    # This is a placeholder as the real iframe wrapping usually happens in the frontend or a specific service
    return html

# --- Core ECharts helpers ---

def page(
    title: str,
    description: str,
    body: str,
    iframe_height: int = DEFAULT_IFRAME_HEIGHT,
) -> str:
    meta = ""
    if title:
        meta += f"<div class='chart-title'>{escape(title)}</div>"
    if description:
        meta += f"<div class='chart-desc'>{escape(description)}</div>"
    if meta:
        meta = f"<div class='meta'>{meta}</div>"

    return f"""<!-- codex-iframe-height:{_clamp_iframe_height(iframe_height)} -->
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <script src='{ECHARTS_CDN}'></script>
  <style>{SHARED_CSS}</style>
</head>
<body>
  <main class='chart-shell'>
    {meta}
    {body}
  </main>
</body>
</html>"""

def chart_page(
    config: dict,
    title: str,
    description: str,
    height: int = 350,
    iframe_height: int | None = None,
) -> str:
    chart_json = json.dumps(config)
    
    body = f"""
    <div class='chart-card'>
      <div class='wrap' style='height:{height}px; width:100%'>
        <div id='echarts-container' style='width: 100%; height: 100%;'></div>
      </div>
    </div>
    <script>
      var chartDom = document.getElementById('echarts-container');
      var myChart = echarts.init(chartDom);
      var option = {chart_json};
      option && myChart.setOption(option);
      window.addEventListener('resize', function() {{
        myChart.resize();
      }});
    </script>
    """
    
    if iframe_height is None:
        iframe_height = height + 150
        
    html = page(title, description, body, iframe_height=iframe_height)
    
    return {
        "html": html,
        "config": config
    }

def build_generic_config(
    chart_type: str,
    labels: List[str],
    datasets: List[Dict[str, Any]],
    title: str = "",
    x_label: str = "",
    y_label: str = "",
    zoomable: bool = True
) -> Dict[str, Any]:
    option = get_base_echarts_option(title=title, x_label=x_label, y_label=y_label, zoomable=zoomable)
    
    # Handle specific chart types
    if chart_type in ["vertical_bar", "horizontal_bar", "grouped_bar", "stacked_bar"]:
        option["xAxis"].update({"type": 'category', "data": labels})
        option["yAxis"].update({"type": 'value'})
        if chart_type == "horizontal_bar":
            option["xAxis"]["type"], option["yAxis"]["type"] = option["yAxis"]["type"], option["xAxis"]["type"]
            option["xAxis"]["data"], option["yAxis"]["data"] = option.get("yAxis", {}).get("data"), option.get("xAxis", {}).get("data")
            # Swap names too
            option["xAxis"]["name"], option["yAxis"]["name"] = option["yAxis"]["name"], option["xAxis"]["name"]
        
        for ds in datasets:
            series = {
                "name": ds["label"],
                "type": 'bar',
                "data": ds["data"],
                "emphasis": {"focus": 'series'}
            }
            if chart_type == "stacked_bar":
                series["stack"] = 'total'
            option["series"].append(series)
            
    elif chart_type in ["line_chart", "area_chart", "multi_line"]:
        option["xAxis"].update({"type": 'category', "boundaryGap": False, "data": labels})
        option["yAxis"].update({"type": 'value'})
        for ds in datasets:
            series = {
                "name": ds["label"],
                "type": 'line',
                "data": ds["data"],
                "smooth": True
            }
            if chart_type == "area_chart":
                series["areaStyle"] = {}
            option["series"].append(series)
            
    elif chart_type in ["pie_chart", "donut_chart"]:
        option["tooltip"] = {"trigger": 'item'}
        option["legend"] = {"orient": 'vertical', "left": 'left'}
        # Pie only uses one series
        data_points = []
        # Combine labels and data from first dataset
        if datasets:
            vals = datasets[0]["data"]
            for i, label in enumerate(labels):
                if i < len(vals):
                    data_points.append({"value": vals[i], "name": label})
        
        series = {
            "name": title,
            "type": 'pie',
            "radius": '50%' if chart_type == "pie_chart" else ['40%', '70%'],
            "data": data_points,
            "emphasis": {
                "itemStyle": {
                    "shadowBlur": 10,
                    "shadowOffsetX": 0,
                    "shadowColor": 'rgba(0, 0, 0, 0.5)'
                }
            }
        }
        option["series"] = [series]
        
    else:
        # Default fallback to bar
        option["xAxis"] = {"type": 'category', "data": labels}
        option["yAxis"] = {"type": 'value'}
        for ds in datasets:
            option["series"].append({
                "name": ds["label"],
                "type": 'bar',
                "data": ds["data"]
            })

    return option

def get_base_echarts_option(title: str = "", x_label: str = "", y_label: str = "", zoomable: bool = True) -> dict:
    option = {
        "title": {
            "text": title,
            "left": "center",
            "textStyle": {"fontSize": 14, "fontWeight": "bold"}
        },
        "tooltip": {
            "trigger": 'axis',
            "axisPointer": {"type": 'shadow'}
        },
        "xAxis": {
            "name": x_label,
            "nameLocation": "middle",
            "nameGap": 30
        },
        "yAxis": {
            "name": y_label,
            "nameLocation": "middle",
            "nameGap": 40
        },
        "legend": {
            "type": "scroll",
            "bottom": 0
        },
        "grid": {
            "left": '3%',
            "right": '4%',
            "bottom": '25%',
            "top": '8%',
            "containLabel": True
        },
        "series": []
    }
    
    if zoomable:
        option["toolbox"] = {
            "show": True,
            "feature": {
                "restore": {"title": "Reset Zoom"}
            },
            "right": "3%",
            "top": "0%"
        }
        option["grid"]["top"] = "12%"
        option["dataZoom"] = [
            {
                "type": "inside",
                "realtime": True,
                "start": 0,
                "end": 100
            },
            {
                "type": "slider",
                "realtime": True,
                "start": 0,
                "end": 100,
                "bottom": "10%",
                "height": 20
            }
        ]
    
    return option

def normalize_scatter_series(data):
    if not isinstance(data, list):
        return []
    points = []
    for item in data:
        if isinstance(item, dict):
            points.append({
                "x": to_number(item.get("x", item.get("value_x", 0))),
                "y": to_number(item.get("y", item.get("value_y", 0))),
            })
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            points.append({"x": to_number(item[0]), "y": to_number(item[1])})
    return points

def normalize_matrix_data(data): return [], [], []

def normalize_gauge_data(data, title=""):
    val = 0.0
    label = title or "Value"
    if isinstance(data, (int, float)):
        val = float(data)
    elif isinstance(data, dict):
        val = to_number(data.get("value", data.get("val", 0)))
        label = str(data.get("label", data.get("name", label)))
    elif isinstance(data, list) and data:
        if isinstance(data[0], dict):
            val = to_number(data[0].get("value", data[0].get("val", 0)))
            label = str(data[0].get("label", data[0].get("name", label)))
        elif isinstance(data[0], (int, float)):
            val = float(data[0])
    return {"min": 0, "max": 100, "value": val, "label": label}

def normalize_bullet_data(data, title=""):
    ranges = [50, 75, 100]
    actual = 0.0
    target = 100.0
    label = title or "Metric"
    if isinstance(data, dict):
        ranges = data.get("ranges", ranges)
        actual = to_number(data.get("actual", data.get("value", actual)))
        target = to_number(data.get("target", target))
        label = str(data.get("label", label))
    return {"ranges": ranges, "actual": actual, "target": target, "label": label}

def normalize_kpi_data(data, title=""):
    value = 0.0
    label = title or "KPI"
    trend = []
    if isinstance(data, dict):
        value = to_number(data.get("value", 0))
        label = str(data.get("label", label))
        trend = data.get("trend", [])
    elif isinstance(data, list):
        trend = [to_number(x.get("value", x) if isinstance(x, dict) else x) for x in data]
        value = trend[-1] if trend else 0.0
    return {"value": value, "label": label, "trend": trend}

