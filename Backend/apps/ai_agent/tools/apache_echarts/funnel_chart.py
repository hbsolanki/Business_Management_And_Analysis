from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_single_series

ALIASES = ["funnel", "funnel_chart", "conversion_funnel"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, values = normalize_single_series(parsed_data)
    
    option = get_base_echarts_option(title, zoomable=False)
    option.pop("xAxis", None)
    option.pop("yAxis", None)
    option.pop("grid", None)
    option.pop("dataZoom", None)
    
    data = [{"name": label, "value": value} for label, value in zip(labels, values)]
    
    option["series"] = [
        {
            "name": title or "Funnel",
            "type": "funnel",
            "left": "10%",
            "top": 60,
            "bottom": 60,
            "width": "80%",
            "min": 0,
            "max": max(values) if values else 100,
            "minSize": "0%",
            "maxSize": "100%",
            "sort": "descending",
            "gap": 2,
            "label": {"show": True, "position": "inside"},
            "emphasis": {"label": {"fontSize": 20}},
            "data": data
        }
    ]
    
    return chart_page(option, title, description)
