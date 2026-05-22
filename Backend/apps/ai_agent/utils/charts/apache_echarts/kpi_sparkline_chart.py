from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_kpi_data

ALIASES = ["kpi", "kpi_sparkline", "metric_card"]

def build_chart(parsed_data, title: str, description: str) -> str:
    data = normalize_kpi_data(parsed_data, title)
    
    # KPI Sparkline is a small line chart under a big number
    option = get_base_echarts_option(title)
    option["xAxis"] = {"show": False, "type": "category", "data": list(range(len(data["trend"])))}
    option["yAxis"] = {"show": False, "type": "value"}
    option.pop("dataZoom", None)
    option["grid"] = {"left": 0, "right": 0, "top": "60%", "bottom": 0}
    
    option["title"] = {
        "text": f"{data['value']}",
        "subtext": data["label"],
        "left": "center",
        "top": "10%",
        "textStyle": {"fontSize": 40, "fontWeight": "bold"},
        "subtextStyle": {"fontSize": 14}
    }
    
    option["series"] = [
        {
            "type": "line",
            "data": data["trend"],
            "smooth": True,
            "symbol": "none",
            "areaStyle": {"opacity": 0.1},
            "lineStyle": {"width": 2}
        }
    ]
    
    return chart_page(option, title, description)
