from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["multi_line", "comparison_line"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, datasets = normalize_multi_series(parsed_data)
    
    option = get_base_echarts_option(title)
    option["xAxis"] = {
        "type": "category",
        "boundaryGap": False,
        "data": labels
    }
    option["yAxis"] = {
        "type": "value"
    }
    option["series"] = [
        {
            "name": ds["label"],
            "type": "line",
            "data": ds["data"],
            "smooth": True
        }
        for ds in datasets
    ]
    
    return chart_page(option, title, description)
