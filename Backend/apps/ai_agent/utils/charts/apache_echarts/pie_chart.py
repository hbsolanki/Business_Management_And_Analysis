from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_single_series

ALIASES = ["pie", "pie_chart"]

def build_chart(parsed_data, title: str, description: str) -> str:
    labels, values = normalize_single_series(parsed_data)
    
    option = get_base_echarts_option(title, zoomable=False)
    # Remove grid/axis for pie charts
    option.pop("grid", None)
    option.pop("xAxis", None)
    option.pop("yAxis", None)
    option.pop("dataZoom", None)
    
    pie_data = [{"name": label, "value": value} for label, value in zip(labels, values)]
    
    option["series"] = [
        {
            "name": title or "Distribution",
            "type": "pie",
            "radius": "50%",
            "data": pie_data,
            "emphasis": {
                "itemStyle": {
                    "shadowBlur": 10,
                    "shadowOffsetX": 0,
                    "shadowColor": "rgba(0, 0, 0, 0.5)"
                }
            }
        }
    ]
    
    return chart_page(option, title, description)
