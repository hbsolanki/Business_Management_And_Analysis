from apps.ai_agent.utils.charts.apache_echarts.shared import chart_page, get_base_echarts_option, is_numeric, to_number

ALIASES = ["treemap", "treemap_chart"]

def build_chart(parsed_data, title: str, description: str) -> str:
    """
    Builds a Treemap chart.
    Automatically detects hierarchy if multiple string columns are present.
    """
    if not parsed_data or not isinstance(parsed_data, list):
        return chart_page(get_base_echarts_option(title), title, description)

    first = parsed_data[0]
    keys = list(first.keys())
    
    # Identify value key (numeric) and grouping keys (non-numeric)
    val_key = next((k for k in ["value", "total", "count", "hotel_count"] if k in first and is_numeric(first[k])), None)
    if not val_key:
        val_key = next((k for k in keys if is_numeric(first[k])), keys[-1])
    
    name_keys = [k for k in keys if k != val_key]
    
    # Build Hierarchy
    # We support up to 2 levels: Level 1 (e.g. Country) -> Level 2 (e.g. City)
    tree_data = []
    
    if len(name_keys) >= 2:
        # Grouping logic
        groups = {}
        for row in parsed_data:
            lvl1 = str(row.get(name_keys[1], "Other")) # Primary group (often country)
            lvl2 = str(row.get(name_keys[0], "Other")) # Secondary group (often city)
            val = to_number(row.get(val_key, 0))
            
            if lvl1 not in groups:
                groups[lvl1] = {"name": lvl1, "children": []}
            groups[lvl1]["children"].append({"name": lvl2, "value": val})
        
        tree_data = list(groups.values())
    else:
        # Flat logic
        name_key = name_keys[0] if name_keys else "Item"
        for row in parsed_data:
            tree_data.append({
                "name": str(row.get(name_key, "Unknown")),
                "value": to_number(row.get(val_key, 0))
            })

    option = get_base_echarts_option(title, zoomable=False)
    option.pop("xAxis", None)
    option.pop("yAxis", None)
    option.pop("grid", None)
    option.pop("dataZoom", None)
    
    option["series"] = [
        {
            "type": "treemap",
            "data": tree_data,
            "leafDepth": 1,
            "label": {
                "show": True,
                "formatter": "{b}"
            },
            "upperLabel": {
                "show": True,
                "height": 30
            },
            "itemStyle": {
                "borderColor": "#fff"
            },
            "levels": [
                {"itemStyle": {"borderWidth": 0, "gapWidth": 5}},
                {"itemStyle": {"gapWidth": 1}},
                {"itemStyle": {"gapWidth": 1}}
            ],
            "breadcrumb": {"show": False}
        }
    ]
    
    return chart_page(option, title, description)
