async def trigger_generate_analytics_report(
    start_date: str = "",
    end_date: str = "",
    report_types: str = "all"
) -> dict:
    """
    Opens the Analytics Report Generator form on the frontend.
    Provide start_date and end_date in YYYY-MM-DD format if parsed from user query.
    report_types: comma-separated list of types parsed from user query: "product", "inventory", "cost", "gst", "purchase_order". Defaults to "all".
    """
    return {
        "type": "panel_trigger",
        "panel": "generate_report",
        "parameters": {
            "start_date": start_date,
            "end_date": end_date,
            "report_types": report_types
        }
    }
