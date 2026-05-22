from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_single_series

ALIASES = ["radar", "radar_chart", "spider_chart"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, values = normalize_single_series(parsed_data)
    
    option = get_base_echarts_option(title)
    option.pop("xAxis", None)
    option.pop("yAxis", None)
    option.pop("grid", None)
    option.pop("dataZoom", None)
    
    max_val = max(values) if values else 100
    
    option["radar"] = {
        "indicator": [{"name": label, "max": max_val * 1.2} for label in labels]
    }
    
    option["series"] = [
        {
            "name": title or "Profile",
            "type": "radar",
            "data": [
                {
                    "value": values,
                    "name": "Data"
                }
            ]
        }
    ]
    
    return chart_page(option, title, description)
