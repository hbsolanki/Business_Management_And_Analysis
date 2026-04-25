import logging
from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, is_numeric, to_number

ALIASES = ["heatmap", "heatmap_chart", "heatmap-cartesian", "density_grid"]

def build_chart(parsed_data, title: str, description: str) -> str:
    """
    Builds a Heatmap chart (2D Matrix).
    Automatically detects X, Y, and Value keys.
    """
    if not parsed_data or not isinstance(parsed_data, list):
        return chart_page(get_base_echarts_option(title), title, description)

    first = parsed_data[0]
    keys = list(first.keys())
    
    # 1. Identify best keys
    # Value is the numeric column
    val_key = next((k for k in ["value", "total", "count", "hotel_count"] if k in first and is_numeric(first[k])), None)
    if not val_key:
        val_key = next((k for k in keys if is_numeric(first[k])), keys[-1])
    
    label_keys = [k for k in keys if k != val_key]
    
    if len(label_keys) < 2:
        # Fallback to single-axis if we don't have enough dimensions for a heatmap
        x_key = label_keys[0] if label_keys else "Item"
        y_labels = ["Total"]
        x_labels = sorted(list(set(str(row.get(x_key, "")) for row in parsed_data)))
        data = [[i, 0, to_number(row.get(val_key, 0))] for i, row in enumerate(parsed_data)]
        max_val = max([d[2] for d in data]) if data else 0
    else:
        # X is first label key, Y is second
        x_key, y_key = label_keys[0], label_keys[1]
        x_labels = sorted(list(set(str(row.get(x_key, "")) for row in parsed_data)))
        y_labels = sorted(list(set(str(row.get(y_key, "")) for row in parsed_data)))
        
        x_map = {val: i for i, val in enumerate(x_labels)}
        y_map = {val: i for i, val in enumerate(y_labels)}
        
        data = []
        max_val = 0
        for row in parsed_data:
            x_val = str(row.get(x_key, ""))
            y_val = str(row.get(y_key, ""))
            val = to_number(row.get(val_key, 0))
            if x_val in x_map and y_val in y_map:
                data.append([x_map[x_val], y_map[y_val], val])
                max_val = max(max_val, val)

    option = get_base_echarts_option(title)
    option["xAxis"] = {"type": "category", "data": x_labels, "splitArea": {"show": True}}
    option["yAxis"] = {"type": "category", "data": y_labels, "splitArea": {"show": True}}
    
    option["visualMap"] = {
        "min": 0,
        "max": max_val or 10,
        "calculable": True,
        "orient": "horizontal",
        "left": "center",
        "bottom": "5%",
        "inRange": {
            "color": ["#f0f9ff", "#bae6fd", "#0ea5e9", "#0369a1"]
        }
    }
    
    option["series"] = [
        {
            "name": title,
            "type": "heatmap",
            "data": data,
            "label": {"show": True},
            "emphasis": {
                "itemStyle": {
                    "shadowBlur": 10,
                    "shadowColor": "rgba(0, 0, 0, 0.5)"
                }
            }
        }
    ]
    
    return chart_page(option, title, description)
