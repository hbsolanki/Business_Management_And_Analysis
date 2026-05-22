async def get_user_contex_tool() -> dict:
    """
    Return the current user's security context (role, business_id, branch_id, user_id).
    Used to understand the authorization scope before building queries.
    """
    from apps.ai_agent.utils.context import current_user_context
    ctx = current_user_context.get()
    if not ctx:
        return {"error": "No security context found. Access denied."}
    
    from django.utils import timezone
    
    return {
        "role":          ctx.get("role"),
        "business_id":   ctx.get("business_id"),
        "branch_id":     ctx.get("branch_id"),
        "user_id":       ctx.get("user_id"),
        "current_date":  timezone.localdate().strftime("%Y-%m-%d"),
    }
