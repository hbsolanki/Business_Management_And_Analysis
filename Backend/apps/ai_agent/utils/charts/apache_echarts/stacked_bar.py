from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["stacked_bar", "segment_bar"]

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
            "stack": "total", # This makes it stacked
            "data": ds["data"],
            "emphasis": {"focus": "series"}
        }
        for ds in datasets
    ]
    
    return chart_page(option, title, description)
