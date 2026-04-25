from apps.ai_agent.tools.apache_echarts.shared import chart_page, get_base_echarts_option, normalize_gauge_data

ALIASES = ["gauge", "gauge_chart", "dial"]

def build_chart(parsed_data, title: str, description: str) -> str:
    data = normalize_gauge_data(parsed_data, title)
    
    option = get_base_echarts_option(title, zoomable=False)
    option.pop("xAxis", None)
    option.pop("yAxis", None)
    option.pop("grid", None)
    option.pop("dataZoom", None)
    
    option["series"] = [
        {
            "type": "gauge",
            "startAngle": 210,
            "endAngle": -30,
            "min": data["min"],
            "max": data["max"] if data["max"] > data["value"] else round(data["value"] * 1.2, 2),
            "splitNumber": 10,
            "radius": "90%",
            "progress": {
                "show": True,
                "width": 14,
                "itemStyle": {
                    "color": {
                        "type": "linear",
                        "x": 0, "y": 0, "x2": 0, "y2": 1,
                        "colorStops": [
                            {"offset": 0, "color": "#58D9F9"},
                            {"offset": 1, "color": "#185FA5"}
                        ]
                    }
                }
            },
            "axisLine": {"lineStyle": {"width": 14, "color": [[1, "#E6EBF8"]]}},
            "axisTick": {"show": False},
            "splitLine": {"length": 10, "lineStyle": {"width": 2, "color": "#999"}},
            "axisLabel": {
                "distance": 18, 
                "color": "#999", 
                "fontSize": 10,
                "formatter": "{value}"
            },
            "anchor": {"show": True, "showAbove": True, "size": 18, "itemStyle": {"borderWidth": 4, "borderColor": "#185FA5"}},
            "pointer": {"width": 6, "length": "60%", "itemStyle": {"color": "#185FA5"}},
            "title": {"show": True, "offsetCenter": [0, "75%"], "fontSize": 14, "color": "#64748B", "fontWeight": "bold"},
            "detail": {
                "valueAnimation": True,
                "fontSize": 28,
                "offsetCenter": [0, "45%"],
                "formatter": "{value}",
                "color": "#0F172A",
                "fontWeight": "bold"
            },
            "data": [{"value": round(data["value"], 2), "name": data["label"]}]
        }
    ]
    
    return chart_page(option, title, description)
