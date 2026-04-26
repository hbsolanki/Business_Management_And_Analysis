import json

# ── CDN ───────────────────────────────────────────────────────────────────
_CDN = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"

# ── Premium color palette (works on white & dark bg) ─────────────────────
# Each color: [fill, border]
PALETTE = [
    ["#378ADD", "#185FA5"],   # blue
    ["#1D9E75", "#0F6E56"],   # teal
    ["#EF9F27", "#BA7517"],   # amber
    ["#D85A30", "#993C1D"],   # coral
    ["#7F77DD", "#534AB7"],   # purple
    ["#D4537E", "#993556"],   # pink
    ["#639922", "#3B6D11"],   # green
    ["#E24B4A", "#A32D2D"],   # red
]

FILLS   = [p[0] for p in PALETTE]
BORDERS = [p[1] for p in PALETTE]

# Transparent fills for area/line
FILLS_T = [
    "rgba(55,138,221,0.15)",
    "rgba(29,158,117,0.15)",
    "rgba(239,159,39,0.15)",
    "rgba(216,90,48,0.15)",
    "rgba(127,119,221,0.15)",
    "rgba(212,83,126,0.15)",
    "rgba(99,153,34,0.15)",
    "rgba(226,75,74,0.15)",
]


def to_number(v):
    try:
        return float(v)
    except Exception:
        return 0


def _normalize(parsed_data: list) -> tuple:
    """Auto-detect category/value keys and return (labels, values)."""
    if not parsed_data or not isinstance(parsed_data, list):
        return [], []
    keys = list(parsed_data[0].keys())
    ck = keys[0]
    vk = keys[1] if len(keys) > 1 else keys[0]
    labels = [str(row.get(ck, "N/A")) for row in parsed_data]
    values = [to_number(row.get(vk, 0)) for row in parsed_data]
    return labels, values


def _prepare_html(html: str) -> str:
    """Returns the raw HTML. The frontend will wrap it in an iframe."""
    return html


# ── Shared CSS injected into every chart page ─────────────────────────────
_SHARED_CSS = """
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
  .legend {
    display: flex; flex-wrap: wrap; gap: 8px 16px;
    margin-bottom: 12px; font-size: 12px; color: #475569;
  }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-dot {
    width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;
  }
  .wrap { position: relative; width: 100%; background: transparent; }
  .stats {
    display: grid; gap: 8px; margin-bottom: 14px;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  }
  .stat-card {
    background: rgba(241,245,249,0.55);
    border: 1px solid rgba(226,232,240,0.9);
    border-radius: 8px; padding: 10px 12px;
  }
  .stat-label { font-size: 11px; color: #64748b; margin-bottom: 3px; }
  .stat-value { font-size: 18px; font-weight: 500; color: #0f172a; }
"""


def _stat_cards_html(values: list) -> str:
    """Generate 3 summary metric cards: total, max, average."""
    if not values:
        return ""
    total = sum(values)
    mx    = max(values)
    avg   = total / len(values)

    def fmt(n):
        if n >= 1_000_000:
            return f"{n/1_000_000:.1f}M"
        if n >= 1_000:
            return f"{n/1_000:.1f}K"
        if n == int(n):
            return str(int(n))
        return f"{n:.1f}"

    return f"""
    <div class='stats'>
      <div class='stat-card'>
        <div class='stat-label'>Total</div>
        <div class='stat-value'>{fmt(total)}</div>
      </div>
      <div class='stat-card'>
        <div class='stat-label'>Highest</div>
        <div class='stat-value'>{fmt(mx)}</div>
      </div>
      <div class='stat-card'>
        <div class='stat-label'>Average</div>
        <div class='stat-value'>{fmt(avg)}</div>
      </div>
    </div>"""


def _legend_html(labels: list, colors: list) -> str:
    items = "".join(
        f"<span class='legend-item'>"
        f"<span class='legend-dot' style='background:{colors[i % len(colors)]}'></span>"
        f"{label}</span>"
        for i, label in enumerate(labels)
    )
    return f"<div class='legend'>{items}</div>"


def _page(title: str, description: str, body: str) -> str:
    """Assemble a complete HTML page."""
    meta = ""
    if title:
        meta += f"<div class='chart-title'>{title}</div>"
    if description:
        meta += f"<div class='chart-desc'>{description}</div>"
    if meta:
        meta = f"<div class='meta'>{meta}</div>"

    return f"""<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <script src='{_CDN}'></script>
  <style>{_SHARED_CSS}</style>
</head>
<body>
  {meta}
  {body}
</body>
</html>"""


# ══════════════════════════════════════════════════════════════════════════ #
#  CHART BUILDERS                                                            #
# ══════════════════════════════════════════════════════════════════════════ #

def _build_column(labels, values, title, description):
    """Vertical bar chart with stat cards + custom legend."""
    stat_html  = _stat_cards_html(values)
    legend_html = _legend_html(labels, FILLS)

    cfg = json.dumps({
        "type": "bar",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": title or "Value",
                "data": values,
                "backgroundColor": [FILLS[i % len(FILLS)] for i in range(len(values))],
                "borderColor":     [BORDERS[i % len(BORDERS)] for i in range(len(values))],
                "borderWidth": 0,
                "borderRadius": 6,
                "borderSkipped": False,
            }]
        },
        "options": {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                }
            },
            "scales": {
                "x": {
                    "grid": {"display": False},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                },
                "y": {
                    "grid": {"color": "#f0f0f0", "lineWidth": 1},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                }
            }
        }
    })

    body = f"""
    {stat_html}
    {legend_html}
    <div class='wrap' style='height:280px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _build_bar(labels, values, title, description):
    """Horizontal bar chart — great for rankings."""
    height = max(300, len(labels) * 42 + 60)
    stat_html = _stat_cards_html(values)

    cfg = json.dumps({
        "type": "bar",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": title or "Value",
                "data": values,
                "backgroundColor": [FILLS[i % len(FILLS)] for i in range(len(values))],
                "borderColor":     [BORDERS[i % len(BORDERS)] for i in range(len(values))],
                "borderWidth": 0,
                "borderRadius": 4,
                "borderSkipped": False,
            }]
        },
        "options": {
            "indexAxis": "y",
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                }
            },
            "scales": {
                "x": {
                    "grid": {"color": "#f0f0f0"},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                },
                "y": {
                    "grid": {"display": False},
                    "ticks": {"color": "#444", "font": {"size": 12}},
                    "border": {"display": False},
                }
            }
        }
    })

    body = f"""
    {stat_html}
    <div class='wrap' style='height:{height}px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _build_line(labels, values, title, description):
    """Clean line chart with smooth tension."""
    stat_html = _stat_cards_html(values)

    cfg = json.dumps({
        "type": "line",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": title or "Value",
                "data": values,
                "borderColor": BORDERS[0],
                "backgroundColor": FILLS_T[0],
                "tension": 0.35,
                "pointRadius": 4,
                "pointHoverRadius": 6,
                "pointBackgroundColor": BORDERS[0],
                "pointBorderColor": "#fff",
                "pointBorderWidth": 2,
                "fill": False,
                "borderWidth": 2.5,
            }]
        },
        "options": {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                    "mode": "index",
                    "intersect": False,
                }
            },
            "scales": {
                "x": {
                    "grid": {"display": False},
                    "ticks": {"color": "#888", "font": {"size": 12},
                              "autoSkip": False, "maxRotation": 45},
                    "border": {"display": False},
                },
                "y": {
                    "grid": {"color": "#f0f0f0"},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                }
            }
        }
    })

    body = f"""
    {stat_html}
    <div class='wrap' style='height:280px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _build_area(labels, values, title, description):
    """Filled area chart — ideal for trends over time."""
    stat_html = _stat_cards_html(values)

    cfg = json.dumps({
        "type": "line",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": title or "Value",
                "data": values,
                "borderColor": BORDERS[1],
                "backgroundColor": FILLS_T[1],
                "tension": 0.4,
                "pointRadius": 3,
                "pointHoverRadius": 6,
                "pointBackgroundColor": BORDERS[1],
                "pointBorderColor": "#fff",
                "pointBorderWidth": 2,
                "fill": True,
                "borderWidth": 2.5,
            }]
        },
        "options": {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                    "mode": "index",
                    "intersect": False,
                }
            },
            "scales": {
                "x": {
                    "grid": {"display": False},
                    "ticks": {"color": "#888", "font": {"size": 12},
                              "autoSkip": False, "maxRotation": 45},
                    "border": {"display": False},
                },
                "y": {
                    "grid": {"color": "#f0f0f0"},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                    "beginAtZero": True,
                }
            }
        }
    })

    body = f"""
    {stat_html}
    <div class='wrap' style='height:280px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _build_pie(labels, values, title, description, donut=False):
    """Pie or donut chart with custom HTML legend showing percentages."""
    total = sum(values) or 1
    legend_items = "".join(
        f"<span class='legend-item'>"
        f"<span class='legend-dot' style='background:{FILLS[i % len(FILLS)]}'></span>"
        f"{labels[i]} &nbsp;<strong>{values[i]/total*100:.1f}%</strong></span>"
        for i in range(len(labels))
    )
    legend_html = f"<div class='legend'>{legend_items}</div>"

    cfg = json.dumps({
        "type": "doughnut" if donut else "pie",
        "data": {
            "labels": labels,
            "datasets": [{
                "data": values,
                "backgroundColor": [FILLS[i % len(FILLS)] for i in range(len(values))],
                "borderColor": "#fff",
                "borderWidth": 3,
                "hoverOffset": 6,
            }]
        },
        "options": {
            "responsive": True,
            "maintainAspectRatio": False,
            "cutout": "55%" if donut else "0%",
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                    "callbacks": {}
                }
            }
        }
    })

    body = f"""
    {legend_html}
    <div class='wrap' style='height:300px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _build_scatter(labels, values, title, description):
    """Scatter plot with padded axis range to prevent clipping."""
    if not values:
        return _page(title, description, "<p>No data</p>")

    mn, mx = min(values), max(values)
    pad = (mx - mn) * 0.12 if mx != mn else 1
    points = [{"x": i + 1, "y": v} for i, v in enumerate(values)]

    cfg = json.dumps({
        "type": "scatter",
        "data": {
            "datasets": [{
                "label": title or "Value",
                "data": points,
                "backgroundColor": FILLS[4],
                "borderColor": BORDERS[4],
                "borderWidth": 1.5,
                "pointRadius": 6,
                "pointHoverRadius": 8,
            }]
        },
        "options": {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                }
            },
            "scales": {
                "x": {
                    "grid": {"color": "#f0f0f0"},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                },
                "y": {
                    "min": round(mn - pad, 2),
                    "max": round(mx + pad, 2),
                    "grid": {"color": "#f0f0f0"},
                    "ticks": {"color": "#888", "font": {"size": 12}},
                    "border": {"display": False},
                }
            }
        }
    })

    body = f"""
    <div class='wrap' style='height:300px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _build_radar(labels, values, title, description):
    """Radar / spider chart for multi-metric comparison."""
    cfg = json.dumps({
        "type": "radar",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": title or "Value",
                "data": values,
                "borderColor": BORDERS[0],
                "backgroundColor": FILLS_T[0],
                "pointBackgroundColor": BORDERS[0],
                "pointBorderColor": "#fff",
                "pointBorderWidth": 2,
                "pointRadius": 4,
                "borderWidth": 2,
            }]
        },
        "options": {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {
                    "backgroundColor": "#1a1a1a",
                    "titleColor": "#fff",
                    "bodyColor": "#ccc",
                    "padding": 10,
                    "cornerRadius": 6,
                }
            },
            "scales": {
                "r": {
                    "ticks": {
                        "color": "#888",
                        "font": {"size": 10},
                        "backdropColor": "transparent",
                    },
                    "pointLabels": {"color": "#444", "font": {"size": 12}},
                    "grid":        {"color": "#e8e8e8"},
                    "angleLines":  {"color": "#e8e8e8"},
                }
            }
        }
    })

    body = f"""
    <div class='wrap' style='height:320px'>
      <canvas id='c'></canvas>
    </div>
    <script>new Chart(document.getElementById('c').getContext('2d'),{cfg});</script>
    """
    return _page(title, description, body)


def _upgrade_prompt_html(feature: str = "Advanced Analytics") -> str:
    """Return a styled iframe-ready HTML block shown when a feature is not in the plan."""
    html = f"""<!DOCTYPE html>
<html>
<head>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 16px;
}}
.card {{
  border: 1.5px solid #fca5a5;
  background: rgba(254,242,242,0.7);
  border-radius: 10px;
  padding: 18px 22px;
  max-width: 480px;
  width: 100%;
}}
.title {{
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}}
.body {{
  color: #7f1d1d;
  font-size: 13px;
  line-height: 1.5;
}}
.upgrade {{
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  font-weight: 500;
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  padding: 4px 12px;
}}
</style>
</head>
<body>
<div class="card">
  <div class="title">⚠ {feature} not available in your plan</div>
  <div class="body">
    Charts and data visualizations require the <strong>{feature}</strong> feature.
    Upgrade your subscription plan to unlock this capability.
  </div>
  <div class="upgrade">🔒 Upgrade Plan</div>
</div>
</body>
</html>"""
    return _prepare_html(html)


def _check_advanced_analytics() -> bool:
    """Return True if the current user's subscription includes advanced analytics."""
    from apps.ai_agent.agent import current_user_context
    from apps.subscription.utils.entitlements import can_use_feature
    from apps.business.models import Business
    ctx = current_user_context.get()
    if not ctx:
        return False
    biz_id = ctx.get("business_id")
    if not biz_id:
        return False
    try:
        business = Business.all_objects.get(id=biz_id)
        # can_use_feature now fallbacks to plan settings if subscription field is null
        allowed, _ = can_use_feature(business, "has_advanced_analytics")
        return allowed
    except Exception:
        return False


def generate_chart(
    chart_type: str,
    data: str,
    title: str = "Visualization",
    description: str = "",
) -> str:
    """
    Generates a premium interactive Chart.js chart and returns an iframe HTML string.

    Args:
        chart_type: One of 'column', 'bar', 'line', 'area', 'pie', 'donut', 'scatter', 'radar'
                    - 'column'  → vertical bar chart  (best for category comparisons)
                    - 'bar'     → horizontal bar chart (best for rankings / long labels)
                    - 'line'    → line chart           (best for time series / trends)
                    - 'area'    → filled area chart    (best for cumulative trends)
                    - 'pie'     → pie chart            (best for part-of-whole, ≤6 items)
                    - 'donut'   → donut/ring chart     (same as pie, more modern look)
                    - 'scatter' → scatter plot         (best for distribution / correlation)
                    - 'radar'   → radar/spider chart   (best for multi-metric performance)
        data:       JSON string — a list of objects with exactly 2 keys.
                    First key  = category label (string).
                    Second key = numeric value.
                    Example: '[{"product": "iPhone", "sales": 120}, {"product": "iPad", "sales": 80}]'
        title:      Chart title shown above the chart.
        description: Optional subtitle/description shown below the title.

    Returns:
        HTML string — an <iframe srcdoc="..."> ready to inject into the frontend as-is.
        The frontend must NOT wrap this in another iframe.
    """
    # Subscription gate - disabled for development to ensure charts show up
    # if not _check_advanced_analytics():
    #     return _upgrade_prompt_html("Advanced Analytics")

    try:
        if isinstance(data, list):
            parsed_data = data
        else:
            try:
                parsed_data = json.loads(data)
            except Exception:
                parsed_data = []

        labels, values = _normalize(parsed_data)
        ct = chart_type.lower().strip()

        builders = {
            "column":    lambda: _build_column(labels, values, title, description),
            "bar":       lambda: _build_bar(labels, values, title, description),
            "line":      lambda: _build_line(labels, values, title, description),
            "area":      lambda: _build_area(labels, values, title, description),
            "pie":       lambda: _build_pie(labels, values, title, description, donut=False),
            "donut":     lambda: _build_pie(labels, values, title, description, donut=True),
            "scatter":   lambda: _build_scatter(labels, values, title, description),
            "radar":     lambda: _build_radar(labels, values, title, description),
        }

        builder = builders.get(ct, builders["column"])
        html = builder()
        final_html = _prepare_html(html)

        from apps.ai_agent.agent import current_message_id
        from apps.ai_agent.models import AiChartRef
        msg_id = current_message_id.get()

        if msg_id:
            chart_ref = AiChartRef.objects.create(message_id=msg_id, html=final_html)
            return {
                "result": f"<ChartRef:{chart_ref.id}>",
                "id": str(chart_ref.id),
                "html": final_html
            }

        return {"result": final_html, "html": final_html}

    except Exception as e:
        return f"<p style='color:red;font-family:sans-serif'>Chart error: {e}</p>"