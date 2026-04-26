from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["bubble", "bubble_chart"]

def build_chart(parsed_data, title: str, description: str) -> str:
    # Bubble data: [x, y, size]
    rows = parsed_data if isinstance(parsed_data, list) else []
    data = []
    for row in rows:
        if isinstance(row, dict):
            # Try to find x, y, size
            x = row.get("x", row.get("value_x", 0))
            y = row.get("y", row.get("value_y", 0))
            z = row.get("z", row.get("size", row.get("value_z", 10)))
            label = row.get("label", row.get("name", ""))
            data.append([x, y, z, label])
        elif isinstance(row, (list, tuple)) and len(row) >= 3:
            data.append(list(row))
            
    option = get_base_echarts_option(title)
    option["xAxis"] = {"type": "value", "scale": True}
    option["yAxis"] = {"type": "value", "scale": True}
    
    option["series"] = [
        {
            "data": data,
            "type": "scatter",
            "symbolSize": "function (data) { return Math.sqrt(data[2]) * 2; }", # Dynamic sizing
            "label": {
                "show": True,
                "formatter": "function (param) { return param.data[3]; }",
                "position": "top"
            }
        }
    ]
    
    return chart_page(option, title, description)
