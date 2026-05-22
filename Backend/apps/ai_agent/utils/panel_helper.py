from typing import Type
from django.db import models
from asgiref.sync import sync_to_async
from apps.ai_agent.utils.context import current_user_context

def make_panel_trigger(panel: str, **kwargs) -> dict:
    """
    Creates a standard panel trigger payload with filtered initial_data.
    Only includes keys where the value is not None.
    """
    payload = {"type": "panel_trigger", "panel": panel}
    initial_data = {k: v for k, v in kwargs.items() if v is not None}
    if initial_data:
        payload["initial_data"] = initial_data
    return payload

async def verify_and_trigger_edit(model: Type[models.Model], id: int, panel: str, friendly_name: str) -> dict:
    """
    Verifies user business context and model record existence, then triggers the edit panel.
    """
    ctx = current_user_context.get()
    if not ctx:
        return {"error": "Authentication context missing."}

    exists = await sync_to_async(
        model.objects.filter(id=id, business_id=ctx.get("business_id")).exists
    )()
    if not exists:
        return {"error": f"{friendly_name} with ID {id} not found."}

    return {"type": "panel_trigger", "panel": panel, "id": id}
