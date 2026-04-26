from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["donut", "donut_chart", "ring_chart"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, values = normalize_multi_series(parsed_data) if isinstance(parsed_data, dict) else ([], [])
    if not labels:
        from apps.ai_agent.tools.apache_echarts.shared import normalize_single_series
        labels, values = normalize_single_series(parsed_data)
        
    option = get_base_echarts_option(title, zoomable=False)
    option.pop("grid", None)
    option.pop("xAxis", None)
    option.pop("yAxis", None)
    option.pop("dataZoom", None)
    
    pie_data = [{"name": label, "value": value} for label, value in zip(labels, values)]
    
    option["series"] = [
        {
            "name": title or "Distribution",
            "type": "pie",
            "radius": ["40%", "70%"], # Inner and outer radius makes it a donut
            "avoidLabelOverlap": False,
            "itemStyle": {
                "borderRadius": 10,
                "borderColor": "#fff",
                "borderWidth": 2
            },
            "label": {
                "show": False,
                "position": "center"
            },
            "emphasis": {
                "label": {
                    "show": True,
                    "fontSize": 20,
                    "fontWeight": "bold"
                }
            },
            "data": pie_data
        }
    ]
    
    return chart_page(option, title, description)
