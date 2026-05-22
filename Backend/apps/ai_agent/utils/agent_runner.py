import json
import asyncio
import traceback
import logging
import warnings
from typing import Callable, Awaitable, Any

from google.genai import types
from apps.ai_agent.utils.context import get_tenant_semaphore
from apps.ai_agent.models import AiChatMessageSenderChoices
from apps.ai_agent.utils.session_db import (
    create_assistant_message, get_or_create_session, 
    save_message, get_user_context_data, get_session_title, finalize_assistant_message
)

# Suppress the 'non-text parts' warning from google-genai SDK
warnings.filterwarnings("ignore", message=".*non-text parts in the response.*")

logger = logging.getLogger(__name__)

# type alias for the WebSocket/SSE send callable
SendFn = Callable[[dict], Awaitable[None]]

TOOL_NAME_MAP = {
    "get_user_contex_tool": "Identifying context",
    "get_schema_tool": "Exploring data structure",
    "query_build_tool": "Designing analysis",
    "query_execute_tool": "Fetching data",
    "chart_intent_tool": "Generating Visualization",
    "trigger_add_branch": "Opening Branch Form",
    "trigger_add_product": "Opening Product Form",
    "trigger_add_product_category": "Opening Category Form",
    "trigger_add_cost_category": "Opening Cost Category Form",
    "trigger_add_monthly_cost": "Opening Monthly Cost Form",
    "trigger_add_task": "Opening Task Form",
    "trigger_add_supplier": "Opening Vendor Form",
    "trigger_add_purchase_order": "Opening Purchase Order Form",
    "trigger_add_sales_order": "Opening Sales Order Form",
    "trigger_add_customer": "Opening Customer Form",
    "trigger_add_invoice": "Opening Invoice Form",
    "trigger_edit_branch": "Loading Branch Editor",
    "trigger_edit_product": "Loading Product Editor",
    "trigger_edit_product_category": "Loading Category Editor",
    "trigger_edit_cost_category": "Loading Cost Category Editor",
    "trigger_edit_monthly_cost": "Loading Monthly Cost Editor",
    "trigger_edit_task": "Loading Task Editor",
    "trigger_edit_supplier": "Loading Vendor Editor",
    "trigger_edit_purchase_order": "Loading Purchase Order Editor",
    "trigger_edit_sales_order": "Loading Sales Order Editor",
    "trigger_edit_customer": "Loading Customer Editor",
    "trigger_edit_invoice": "Loading Invoice Editor",
    "list_branches": "Fetching Branches",
    "search_products": "Searching Products",
    "search_suppliers": "Searching Vendors",
    "search_purchase_orders": "Searching Purchase Orders",
    "search_sales_orders": "Searching Sales Orders",
    "search_customers": "Searching Customers",
}


async def _send(send_fn: SendFn, payload: dict) -> None:
    await send_fn(payload)


def json_safe(obj: Any) -> Any:
    """Recursively convert non-JSON-serializable types (Decimal, UUID, date) to primitives."""
    from decimal import Decimal
    import uuid
    import datetime
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (uuid.UUID, datetime.date, datetime.datetime)):
        return str(obj)
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [json_safe(i) for i in obj]
    return obj


def truncate_tool_result(result: Any, max_rows: int = 15, max_chars: int = 10000) -> Any:
    """Truncates large tool results for the LLM to prevent context bloat."""
    if isinstance(result, list):
        if len(result) > max_rows:
            return {
                "sample": result[:max_rows],
                "total_rows": len(result),
                "notice": f"Displaying top {max_rows} results. Narrow down your query if needed."
            }
        return result
    if isinstance(result, str) and len(result) > max_chars:
        return result[:max_chars] + "... [Truncated]"
    if isinstance(result, dict):
        if "result" in result and "<ChartRef:" in str(result["result"]):
            return result
        return {k: (v[:max_rows] if isinstance(v, list) and len(v) > max_rows else v) for k, v in result.items()}
    return result


async def _stream_agent_core(runner, user_id_str: str, session_id: str, query: str, send_fn: SendFn) -> tuple[str, str]:
    """Run the ADK agent and stream events. Returns (full_response, message_id)."""
    full_response = ""
    text_buffer = ""

    assistant_msg = await create_assistant_message(session_id)
    message_id = str(assistant_msg.id)
    structured_parts = []

    from apps.ai_agent.utils.context import current_user_context, current_message_id
    ctx = current_user_context.get()
    biz_id = ctx.get("business_id") if ctx else None
    tenant_sem = get_tenant_semaphore(biz_id)

    async with tenant_sem:
        message = types.Content(parts=[types.Part(text=query)])
        
        token = current_message_id.set(message_id)

        try:
            # --- SESSION SYNC ---
            # Ensure the session exists in ADK Runner storage (Redis) before calling run_async.
            # This prevents SessionNotFoundError if Redis was cleared but DB still has the session.
            try:
                adk_session = await runner.session_service.get_session(
                    app_name=runner.app_name,
                    user_id=user_id_str,
                    session_id=session_id
                )
                if not adk_session:
                    logger.info(f"ADK session {session_id} not found in Redis. Syncing history...")
                    await runner.session_service.create_session(
                        app_name=runner.app_name,
                        user_id=user_id_str,
                        session_id=session_id
                    )
            except Exception as sync_err:
                logger.error(f"Failed to sync ADK session: {sync_err}")

            max_retries = 3
            retry_delay = 1.5

            for attempt in range(max_retries):
                try:
                    async for event in runner.run_async(user_id=user_id_str, session_id=session_id, new_message=message):
                        # tool responses
                        responses = event.get_function_responses()
                        for resp in (responses or []):
                            chart_data = None
                            display_output = None # Hide technical output by default
                            
                            friendly_name = TOOL_NAME_MAP.get(resp.name, "Processed")

                            if isinstance(resp.response, dict):
                                display_output = resp.response.get("result", resp.response)
                            else:
                                display_output = resp.response

                            # Sanitize before any further processing — kills Decimal/UUID/date
                            display_output = json_safe(display_output)

                            if resp.name == "chart_intent_tool" and isinstance(resp.response, dict):
                                chart_data = resp.response # Include full chart config for caching
                            
                            output_payload = {
                                "type": "tool_output", 
                                "tool": friendly_name, 
                                "output": display_output,
                                "chart_data": chart_data
                            }
                            await _send(send_fn, output_payload)

                            # panel_trigger: auto-open the frontend SidePanel directly
                            if isinstance(display_output, dict) and display_output.get("type") == "panel_trigger":
                                await _send(send_fn, {
                                    "type": "panel_trigger",
                                    "panel": display_output.get("panel"),
                                    "id": display_output.get("id"),
                                    "initial_data": display_output.get("initial_data"),
                                })

                            # form: elevate to primary message level (for edit forms)
                            elif isinstance(display_output, dict) and display_output.get("type") == "form":
                                part = {"type": "form", "value": display_output.get("value", display_output)}
                                structured_parts.append(part)
                                await _send(send_fn, {
                                    "type": "structured_part",
                                    "part": part
                                })

                            # confirmation_trigger: elevate to primary message level (for inline confirmations)
                            elif isinstance(display_output, dict) and display_output.get("type") == "confirmation_trigger":
                                part = {"type": "confirmation_trigger", "value": display_output}
                                structured_parts.append(part)
                                await _send(send_fn, {
                                    "type": "structured_part",
                                    "part": part
                                })

                        # tool calls
                        calls = event.get_function_calls()
                        for call in (calls or []):
                            friendly_name = TOOL_NAME_MAP.get(call.name, "Processing")
                            await _send(send_fn, {"type": "tool_start", "tool": friendly_name})

                        # text chunks
                        if event.content and event.content.parts:
                            for part in event.content.parts:
                                # Improved check to avoid the 'non-text parts' warning
                                text_val = None
                                try:
                                    if hasattr(part, 'text') and part.text is not None:
                                        text_val = part.text
                                except Exception:
                                    pass

                                if isinstance(text_val, str):
                                    full_response += text_val
                                    text_buffer += text_val
                                    
                                    while text_buffer:
                                        tag_start = text_buffer.find("<ChartRef")
                                        if tag_start == -1:
                                            possible_start = text_buffer.rfind("<")
                                            if possible_start != -1 and "<ChartRef".startswith(text_buffer[possible_start:]):
                                                if possible_start > 0:
                                                    await _send(send_fn, {"type": "chunk", "content": text_buffer[:possible_start]})
                                                    if len(text_buffer[:possible_start]) < 5:
                                                        await asyncio.sleep(0.01)
                                                    text_buffer = text_buffer[possible_start:]
                                                break
                                            else:
                                                await _send(send_fn, {"type": "chunk", "content": text_buffer})
                                                if len(text_buffer) < 5:
                                                    await asyncio.sleep(0.01)
                                                text_buffer = ""
                                                break
                                        
                                        if tag_start > 0:
                                            await _send(send_fn, {"type": "chunk", "content": text_buffer[:tag_start]})
                                            text_buffer = text_buffer[tag_start:]
                                        
                                        tag_end = text_buffer.find(">")
                                        if tag_end != -1:
                                            tag_text = text_buffer[:tag_end + 1]
                                            await _send(send_fn, {"type": "chunk", "content": tag_text})
                                            text_buffer = text_buffer[tag_end + 1:]
                                        else:
                                            break
                    break # Break retry loop on success
                except Exception as e:
                    error_str = str(e)
                    if "SessionNotFoundError" in error_str or "Session not found" in error_str:
                        raise
                    
                    if not full_response and not structured_parts and attempt < max_retries - 1:
                        logger.warning(f"LLM Stream failed (Attempt {attempt+1}/{max_retries}): {e}. Retrying in {retry_delay}s...")
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2
                    else:
                        raise
            
            # Finalize content: combine text with structured parts
            final_parts = [{"type": "text", "value": full_response}]
            if structured_parts:
                final_parts.extend(structured_parts)
            
            final_content = full_response if not structured_parts else json.dumps(final_parts)
            _, title_updated = await finalize_assistant_message(message_id, final_content)

            await _send(send_fn, {
                "type": "response", 
                "message": final_parts, 
                "session_id": session_id
            })
            
            if text_buffer:
                await _send(send_fn, {"type": "chunk", "content": text_buffer})
                
            return full_response, message_id, title_updated
            
        except Exception as e:
            error_str = str(e)
            if "SessionNotFoundError" in error_str or "Session not found" in error_str:
                logger.error(f"ADK Session Lost: {session_id}. History unavailable.")
                raise ValueError("Chat session history has expired. Re-initializing session...")
            raise e
        finally:
            current_message_id.reset(token)

    return full_response, message_id


async def run_agent_session(user, query: str, session_id: str, agent_name: str, send_fn: SendFn) -> None:
    """High-level orchestrator for an AI Agent session interaction."""
    from apps.ai_agent.agents.analytics_agent import analytics_runner
    from apps.ai_agent.agents.manage_agent import manage_runner
    
    selected_runner = analytics_runner if agent_name == "analytics" else manage_runner

    try:
        # 1. Session & User Message
        chat_session = await get_or_create_session(user.id, session_id)
        chat_session_id = chat_session.id
        await save_message(chat_session_id, AiChatMessageSenderChoices.USER, query)
        
        await _send(send_fn, {
            'type': 'session_info',
            'session_id': str(chat_session_id),
            'title': chat_session.title,
            'is_new': False,
        })

        # 2. Context Setup
        role, biz_id, branch_id, user_id_str = await get_user_context_data(user.id)
        
        from apps.ai_agent.utils.context import current_user_context
        token = current_user_context.set({
            "user_id": user_id_str, "role": role,
            "business_id": biz_id, "branch_id": branch_id,
        })

        # 3. Execution Queue
        queue = asyncio.Queue()

        async def queue_send(payload: dict):
            await queue.put(payload)

        # 4. Agent Task
        async def agent_task_wrapper():
            try:
                resp_text, msg_id, title_updated = await _stream_agent_core(
                    selected_runner, user_id_str, str(chat_session_id), query, queue_send
                )
                await queue.put({
                    "type": "done_streaming", 
                    "full_response": resp_text, 
                    "assistant_message_id": msg_id,
                    "title_updated": title_updated
                })
            except Exception as e:
                if isinstance(e, ValueError):
                    await queue.put({"type": "error", "message": str(e)})
                else:
                    await queue.put({
                        "type": "error", 
                        "message": f"{str(e)}\n{traceback.format_exc()}"
                    })

        task = asyncio.create_task(agent_task_wrapper())

        # 5. Pipeline Events to send_fn
        title_updated = False

        try:
            while True:
                event = await queue.get()
                if event["type"] == "done_streaming":
                    title_updated = event.get("title_updated", False)
                    break
                
                if event["type"] == "error":
                    await _send(send_fn, event)
                    return
                
                await _send(send_fn, event)
        finally:
            if not task.done():
                task.cancel()
            current_user_context.reset(token)

        # 6. Session Title Sync (if needed)
        if title_updated:
            title = await get_session_title(chat_session_id)
            await _send(send_fn, {
                'type': 'session_info',
                'session_id': str(chat_session_id),
                'title': title,
                'is_new': False,
            })

        await _send(send_fn, {'type': 'status', 'message': 'Analysis complete.'})
        await _send(send_fn, {'type': 'done'})

    except Exception as e:
        await _send(send_fn, {
            'type': 'error',
            'message': f'{str(e)}\n{traceback.format_exc()}',
        })
