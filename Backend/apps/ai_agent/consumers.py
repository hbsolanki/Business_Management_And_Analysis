import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from apps.ai_agent.utils.context import current_user_context
from apps.ai_agent.tools.manage_agent_tools.assignment import execute_assignment
from apps.employee.models import UserBusinessRole
from apps.business.models import Branch

logger = logging.getLogger(__name__)

class AiAgentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            logger.warning("[AiAgentConsumer] Connection rejected: Anonymous User.")
            await self.close()
            return

        self.user = user
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        
        # Fetch user business context
        @database_sync_to_async
        def resolve_user_context(u):
            role_obj = UserBusinessRole.objects.filter(user=u).first()
            branch_obj = Branch.objects.filter(business=role_obj.business).first() if role_obj else None
            return {
                "business_id": role_obj.business_id if role_obj else None,
                "branch_id": branch_obj.id if branch_obj else None,
                "role": role_obj.role if role_obj else "EMPLOYEE"
            }

        ctx_data = await resolve_user_context(user)
        self.business_id = ctx_data["business_id"]
        self.branch_id = ctx_data["branch_id"]
        self.role = ctx_data["role"]

        if not self.business_id:
            logger.warning(f"[AiAgentConsumer] Connection rejected: User {user.username} has no linked business.")
            await self.close()
            return

        self.session_group = f"ai_agent_session_{self.session_id}"
        await self.channel_layer.group_add(self.session_group, self.channel_name)
        
        await self.accept()
        logger.info(f"[AiAgentConsumer] WebSocket connected. Session: {self.session_id}, User: {user.username}")

    async def disconnect(self, close_code):
        if hasattr(self, "session_group"):
            await self.channel_layer.group_discard(self.session_group, self.channel_name)
        logger.info(f"[AiAgentConsumer] WebSocket disconnected. Session: {self.session_id}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.info(f"[AiAgentConsumer] Received message: {data}")
            event_type = data.get("type")

            if event_type == "confirm_assignment":
                confirm = data.get("confirm", False)
                entity_type = data.get("entity_type")
                source_id = data.get("source_id")
                target_id = data.get("target_id")

                from apps.ai_agent.utils.session_db import update_last_assistant_message

                if not confirm:
                    cancel_msg = "Assignment cancelled by user."
                    await update_last_assistant_message(self.session_id, cancel_msg)
                    await self.send(json.dumps({
                        "type": "assignment_result",
                        "success": False,
                        "message": cancel_msg
                    }))
                    return

                # Establish the current user execution context for the thread
                ctx = {
                    "business_id": self.business_id,
                    "branch_id": self.branch_id,
                    "user_id": self.user.id,
                    "role": self.role
                }
                current_user_context.set(ctx)

                # Execute the transactional serializer save
                result = await execute_assignment(
                    entity_type=entity_type,
                    source_id=source_id,
                    target_id=target_id
                )

                if "success" in result:
                    success_msg = result["message"]
                    await update_last_assistant_message(self.session_id, success_msg)
                    await self.send(json.dumps({
                        "type": "assignment_result",
                        "success": True,
                        "message": success_msg
                    }))
                else:
                    await self.send(json.dumps({
                        "type": "assignment_result",
                        "success": False,
                        "message": result.get("error", "An unknown error occurred during update.")
                    }))

            elif event_type == "query":
                query_text = data.get("query")
                agent_name = data.get("agent", "analytics")

                async def callback(payload: dict):
                    await self.send(json.dumps(payload))

                ctx = {
                    "business_id": self.business_id,
                    "branch_id": self.branch_id,
                    "user_id": self.user.id,
                    "role": self.role
                }
                current_user_context.set(ctx)

                from apps.ai_agent.utils.agent_runner import run_agent_session
                await run_agent_session(
                    user=self.user,
                    query=query_text,
                    session_id=None if self.session_id == "new" else self.session_id,
                    agent_name=agent_name,
                    send_fn=callback
                )

        except Exception as e:
            logger.error(f"[AiAgentConsumer] Error processing socket message: {e}")
            await self.send(json.dumps({
                "type": "error",
                "message": f"Server processing error: {str(e)}"
            }))
