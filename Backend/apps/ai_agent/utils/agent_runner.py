import json
import asyncio
import traceback
from typing import Callable, Awaitable, Any
from google.genai import types
from asgiref.sync import sync_to_async
from apps.ai_agent.agent import agent_semaphore, default_runner, current_user_context
from apps.ai_agent.models import AiChatMessageSenderChoices
from apps.ai_agent.utils.session_db import (
    create_assistant_message, get_or_create_session, 
    save_message, get_user_context_data, get_session_title, finalize_assistant_message
)

# type alias for the WebSocket/SSE send callable
SendFn = Callable[[dict], Awaitable[None]]


async def _send(send_fn: SendFn, payload: dict) -> None:
    await send_fn(payload)


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

    async with agent_semaphore:
        message = types.Content(parts=[types.Part(text=query)])
        
        from apps.ai_agent.agent import current_message_id
        token = current_message_id.set(message_id)

        try:
            async for event in runner.run_async(user_id=user_id_str, session_id=session_id, new_message=message):
                # tool calls
                calls = event.get_function_calls()
                for call in (calls or []):
                    # Tool calling is now silent per user request
                    pass

                # tool responses
                responses = event.get_function_responses()
                for resp in (responses or []):
                    chart_data = None
                    display_output = resp.response
                    
                    if resp.name == "generate_chart":
                        if isinstance(resp.response, dict):
                            chart_data = {"id": resp.response.get("id"), "html": resp.response.get("html")}
                            display_output = resp.response.get("result")
                    else:
                        display_output = truncate_tool_result(resp.response)

                    output_payload = {
                        "type": "tool_output", 
                        "tool": resp.name, 
                        "output": display_output,
                        "chart_data": chart_data
                    }
                    await _send(send_fn, output_payload)

                # text chunks
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            full_response += part.text
                            text_buffer += part.text
                            
                            while text_buffer:
                                tag_start = text_buffer.find("<ChartRef")
                                if tag_start == -1:
                                    possible_start = text_buffer.rfind("<")
                                    if possible_start != -1 and "<ChartRef".startswith(text_buffer[possible_start:]):
                                        if possible_start > 0:
                                            await _send(send_fn, {"type": "chunk", "content": text_buffer[:possible_start]})
                                            # Small sleep to smooth out typing feel for small chunks
                                            if len(text_buffer[:possible_start]) < 5:
                                                await asyncio.sleep(0.01)
                                            text_buffer = text_buffer[possible_start:]
                                        break
                                    else:
                                        await _send(send_fn, {"type": "chunk", "content": text_buffer})
                                        # Small sleep to smooth out typing feel
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
            if text_buffer:
                await _send(send_fn, {"type": "chunk", "content": text_buffer})
        finally:
            current_message_id.reset(token)

    return full_response, message_id


async def run_agent_session(user, query: str, session_id: str, send_fn: SendFn) -> None:
    """High-level orchestrator for an AI Agent session interaction."""
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
                resp_text, msg_id = await _stream_agent_core(
                    default_runner, user_id_str, str(chat_session_id), query, queue_send
                )
                await queue.put({
                    "type": "done_streaming", 
                    "full_response": resp_text, 
                    "assistant_message_id": msg_id
                })
            except Exception as e:
                await queue.put({
                    "type": "error", 
                    "message": f"{str(e)}\n{traceback.format_exc()}"
                })

        task = asyncio.create_task(agent_task_wrapper())

        # 5. Pipeline Events to send_fn
        full_response = ""
        assistant_msg_id = None

        try:
            while True:
                event = await queue.get()
                if event["type"] == "done_streaming":
                    full_response = event["full_response"]
                    assistant_msg_id = event["assistant_message_id"]
                    break
                
                if event["type"] == "error":
                    await _send(send_fn, event)
                    return
                
                await _send(send_fn, event)
        finally:
            if not task.done():
                task.cancel()
            current_user_context.reset(token)

        # 6. Finalization
        if full_response and assistant_msg_id:
            final_msg, title_updated = await finalize_assistant_message(assistant_msg_id, full_response)
            
            if title_updated:
                title = await get_session_title(chat_session_id)
                await _send(send_fn, {
                    'type': 'session_info',
                    'session_id': str(chat_session_id),
                    'title': title,
                    'is_new': False,
                })

            from apps.ai_agent.serializers import AiChatMessageSerializer
            structured_data = await sync_to_async(lambda: AiChatMessageSerializer(final_msg).data)()

            await _send(send_fn, {
                'type': 'response',
                'message': structured_data.get('content'),
                'session_id': str(chat_session_id),
            })

        await _send(send_fn, {'type': 'status', 'message': 'Analysis complete.'})
        await _send(send_fn, {'type': 'done'})

    except Exception as e:
        await _send(send_fn, {
            'type': 'error',
            'message': f'{str(e)}\n{traceback.format_exc()}',
        })
