from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["column", "vertical_bar", "bar_chart", "vertical"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, datasets = normalize_multi_series(parsed_data)
    
    option = get_base_echarts_option(title)
    option["xAxis"] = {
        "type": "category",
        "data": labels
    }
    option["yAxis"] = {
        "type": "value"
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
