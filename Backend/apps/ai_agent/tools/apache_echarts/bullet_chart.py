from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_bullet_data

ALIASES = ["bullet", "bullet_chart"]

def build_chart(parsed_data, title: str, description: str) -> str:
    data = normalize_bullet_data(parsed_data, title)
    
    # Bullet charts are basically horizontal bars with markers
    option = get_base_echarts_option(title)
    option["xAxis"] = {"type": "value", "max": data["ranges"][-1]}
    option["yAxis"] = {"type": "category", "data": [data["label"]]}
    option.pop("dataZoom", None)
    
    # Range backgrounds
    colors = ["#eee", "#ddd", "#ccc"]
    series = []
    for i, r in enumerate(data["ranges"]):
        series.append({
            "name": f"Range {i+1}",
            "type": "bar",
            "stack": "total",
            "silent": True,
            "itemStyle": {"color": colors[i % len(colors)]},
            "data": [r - (data["ranges"][i-1] if i > 0 else 0)]
        })
        
    # Actual value
    series.append({
        "name": "Actual",
        "type": "bar",
        "barWidth": 20,
        "itemStyle": {"color": "#333"},
        "data": [data["actual"]]
    })
    
    # Target marker
    series.append({
        "name": "Target",
        "type": "scatter",
        "symbol": "rect",
        "symbolSize": [4, 30],
        "itemStyle": {"color": "red"},
        "data": [[data["target"], 0]]
    })
    
    option["series"] = series
    return chart_page(option, title, description)
