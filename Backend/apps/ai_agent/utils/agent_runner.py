import json
from typing import Callable, Awaitable
from google.genai import types
from apps.ai_agent.agent import agent_semaphore
from apps.ai_agent.models import AiAgentMessageWorkflowTypeChoices
from apps.ai_agent.utils.session_db import create_assistant_message, save_workflow_step

# type alias for the WebSocket send callable
SendFn = Callable[[str], Awaitable[None]]


async def _send(send_fn: SendFn, payload: dict) -> None:
    await send_fn(json.dumps(payload))


async def inject_chart(resp, full_response: str, send_fn: SendFn) -> str:
    """Append iframe HTML from generate_chart to the response stream."""
    raw = resp.response or {}
    iframe_html = raw.get("result", "") if isinstance(raw, dict) else str(raw)
    if iframe_html and "<iframe" in iframe_html:
        chunk = f"\n{iframe_html}\n"
        full_response += chunk
        await _send(send_fn, {"type": "chunk", "message": chunk})
    return full_response


async def stream_agent(runner, user_id_str: str, session_id: str, query: str, send_fn: SendFn) -> tuple[str, str]:
    """Run the ADK agent and stream events to the WebSocket client.

    Returns (full_response, message_id).
    """
    full_response = ""

    # Create the assistant message entry immediately to link workflow steps
    assistant_msg = await create_assistant_message(session_id)
    message_id = str(assistant_msg.id)

    async with agent_semaphore:
        message = types.Content(parts=[types.Part(text=query)])

        async for event in runner.run_async(user_id=user_id_str, session_id=session_id, new_message=message):

            # tool calls
            calls = event.get_function_calls()
            for call in (calls or []):
                status_payload = {"type": "status", "message": f"Calling tool: {call.name}"}
                await _send(send_fn, status_payload)
                await save_workflow_step(message_id, AiAgentMessageWorkflowTypeChoices.STATUS, status_payload)

            # tool responses
            responses = event.get_function_responses()
            for resp in (responses or []):
                output_payload = {"type": "tool_output", "tool": resp.name, "output": resp.response}
                await _send(send_fn, output_payload)
                await save_workflow_step(message_id, AiAgentMessageWorkflowTypeChoices.TOOL_OUTPUT, output_payload)

                if resp.name == "generate_chart":
                    full_response = await inject_chart(resp, full_response, send_fn)

            # text chunks
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        full_response += part.text
                        await _send(send_fn, {"type": "chunk", "message": part.text})

    return full_response, message_id
