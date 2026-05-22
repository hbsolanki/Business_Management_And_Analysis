from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["bar", "horizontal_bar", "rankings"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, datasets = normalize_multi_series(parsed_data)
    
    option = get_base_echarts_option(title)
    # For horizontal bars, X is value and Y is category
    option["xAxis"] = {
        "type": "value"
    }
    option["yAxis"] = {
        "type": "category",
        "data": labels,
        "inverse": True # Typical for rankings to have top item at top
    }
    option["series"] = [
        {
            "name": ds["label"],
            "type": "bar",
            "data": ds["data"]
        }
        for ds in datasets
    ]
    
    return chart_page(option, title, description)
