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
    try: return float(v)
    except: return 0.0

def is_numeric(v: Any) -> bool:
    try: float(v); return True
    except: return False

def format_number(v: float) -> str:
    if v >= 1_000_000: return f"{v/1_000_000:.1f}M"
    if v >= 1_000: return f"{v/1_000:.1f}k"
    return str(v)

def load_data(data: Union[str, List]) -> List:
    if isinstance(data, str):
        try: return json.loads(data)
        except: return []
    return data if isinstance(data, list) else []

def normalize_single_series(data: List[Dict]) -> Tuple[List[str], List[float]]:
    if not data: return [], []
    keys = list(data[0].keys())
    xk, yk = keys[0], keys[1] if len(keys) > 1 else keys[0]
    labels = [str(row.get(xk, "N/A")) for row in data]
    values = [to_number(row.get(yk, 0)) for row in data]
    return labels, values

def normalize_multi_series(data: List[Dict]) -> Tuple[List[str], List[Dict]]:
    if not data: return [], []
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
        
    return page(title, description, body, iframe_height=iframe_height)

def get_base_echarts_option(title: str = "", zoomable: bool = True) -> dict:
    option = {
        "tooltip": {
            "trigger": 'axis',
            "axisPointer": {"type": 'shadow'}
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
        }
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

# Add dummy stubs for other complex normalizers if they are called by specific chart builders
def normalize_scatter_series(data): return []
def normalize_matrix_data(data): return [], [], []
def normalize_gauge_data(data): return 0
def normalize_bullet_data(data): return {}
def normalize_kpi_data(data): return {}
