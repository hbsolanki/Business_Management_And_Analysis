from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["combo", "combo_bar_line", "mixed"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, datasets = normalize_multi_series(parsed_data)
    
    option = get_base_echarts_option(title)
    option["xAxis"] = {
        "type": "category",
        "data": labels
    }
    # Two Y axes for combo chart
    option["yAxis"] = [
        {"type": "value", "name": "Primary"},
        {"type": "value", "name": "Secondary", "position": "right", "splitLine": {"show": False}}
    ]
    
    option["series"] = []
    for idx, ds in enumerate(datasets):
        # Default: first series is bar, others are line
        series_type = "bar" if idx == 0 else "line"
        y_axis_index = 0 if idx == 0 else 1
        
        option["series"].append({
            "name": ds["label"],
            "type": series_type,
            "yAxisIndex": y_axis_index,
            "data": ds["data"],
            "smooth": True if series_type == "line" else False
        })
    
    return chart_page(option, title, description)
