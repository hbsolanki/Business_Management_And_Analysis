from apps.ai_agent.utils.db.context import get_db_schema

async def get_schema_tool() -> dict:
    """
    Return columns grouped by table name for all authorized bma_ tables.
    Use this to understand available tables and columns before building a query.
    """
    return await get_db_schema()
