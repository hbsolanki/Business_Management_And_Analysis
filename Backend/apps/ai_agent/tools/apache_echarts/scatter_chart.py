from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_multi_series

ALIASES = ["scatter", "scatter_chart", "dot_plot"]

def build_chart(parsed_data, title: str, description: str) -> str:
    # Scatter data often comes as a list of lists [x, y] or list of dicts
    from apps.ai_agent.tools.apache_echarts.shared import normalize_scatter_series
    points = normalize_scatter_series(parsed_data)
    
    option = get_base_echarts_option(title)
    option["xAxis"] = {"type": "value", "scale": True}
    option["yAxis"] = {"type": "value", "scale": True}
    
    option["series"] = [
        {
            "symbolSize": 10,
            "data": [[p["x"], p["y"]] for p in points],
            "type": "scatter"
        }
    ]
    
    return chart_page(option, title, description)
