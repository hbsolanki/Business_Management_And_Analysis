import json
import traceback
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from apps.ai_agent.models import AiChatMessageSenderChoices
from apps.ai_agent.agent import default_runner, current_user_context
from apps.ai_agent.utils.session_db import (
    get_or_create_session, save_message, get_user_context_data, get_session_title, finalize_assistant_message
)
from apps.ai_agent.utils.agent_runner import stream_agent
from apps.subscription.utils.entitlements import can_use_feature


class AgentConsumer(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.runner = default_runner

    @database_sync_to_async
    def _has_ai_agent_subscription(self, user):
        allowed, _ = can_use_feature(user.business, "has_ai_agent")
        return allowed

    async def connect(self):
        user = self.scope.get("user")
        if not (user and user.is_authenticated):
            await self.close()
            return
        if not await self._has_ai_agent_subscription(user):
            await self.accept()
            await self.send(json.dumps({
                "type": "error",
                "message": "AI Agent is not available in your current subscription plan.",
            }))
            await self.close()
            return
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        try:
            # parse
            data = json.loads(text_data)
            query = data.get("query")
            session_id = data.get("session_id")

            if not query:
                await self.send(json.dumps({"type": "error", "message": "No query provided."}))
                return

            # auth
            user_id = self.scope.get("session", {}).get("_auth_user_id") or getattr(self.scope.get("user"), "id", None)
            if not user_id:
                await self.send(json.dumps({"type": "error", "message": "Authentication required."}))
                return

            # session
            chat_session = await get_or_create_session(user_id, session_id)
            chat_session_id = chat_session.id
            await save_message(chat_session_id, AiChatMessageSenderChoices.USER, query)
            await self.send(json.dumps({
                "type": "session_info",
                "session_id": str(chat_session_id),
                "title": chat_session.title,
                "is_new": False,
            }))

            # context
            role, biz_id, branch_id, user_id_str = await get_user_context_data(user_id)
            token = current_user_context.set({
                "user_id": user_id_str, "role": role,
                "business_id": biz_id, "branch_id": branch_id,
            })

            # run agent
            try:
                full_response, assistant_msg_id = await stream_agent(self.runner, user_id_str, str(chat_session_id), query, self.send)
            finally:
                current_user_context.reset(token)

            # finalize & notify
            if full_response and assistant_msg_id:
                _, title_updated = await finalize_assistant_message(assistant_msg_id, full_response)
                if title_updated:
                    title = await get_session_title(chat_session_id)
                    await self.send(json.dumps({
                        "type": "session_info",
                        "session_id": str(chat_session_id),
                        "title": title,
                        "is_new": False,
                    }))

            # respond
            await self.send(json.dumps({
                "type": "response",
                "message": full_response,
                "session_id": str(chat_session_id),
            }))

        except Exception as e:
            await self.send(json.dumps({
                "type": "error",
                "message": f"{str(e)}\n{traceback.format_exc()}",
            }))
