import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from apps.employee.models import UserRole

class ActivityLogConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return

        # Use helper to get all necessary data in one DB call
        user_data = await self._get_user_context(user)
        
        if not user_data["has_permission"]:
            await self.close()
            return

        self.user = user
        self.business_id = user_data["business_id"]
        self.role_name = user_data["role_name"]
        self.active_groups = []

        if self.role_name == UserRole.OWNER:
            # Owners see everything in their business
            self.active_groups.append(f"activity_logs_{self.business_id}")
        elif self.role_name in (UserRole.MANAGER, UserRole.EMPLOYEE):
            # Managers and Employees see only their assigned branches
            branch_ids = user_data["branch_ids"]
            for b_id in branch_ids:
                self.active_groups.append(f"activity_logs_branch_{b_id}")

        for group in self.active_groups:
            await self.channel_layer.group_add(
                group,
                self.channel_name
            )

        await self.accept()

    @database_sync_to_async
    def _get_user_context(self, user):
        return {
            "has_permission": user.has_perm("activity_log.view_activitylog"),
            "business_id": user.business_id,
            "role_name": user.role_name,
            "branch_ids": list(user.branches.values_list('id', flat=True))
        }

    async def disconnect(self, close_code):
        if hasattr(self, "active_groups"):
            for group in self.active_groups:
                await self.channel_layer.group_discard(
                    group,
                    self.channel_name
                )

    async def activity_log_message(self, event):
        """
        Handler for activity_log_message events.
        Sends the log data to the WebSocket.
        """
        data = event.get("data")
        await self.send(json.dumps({
            "type": "activity_log",
            "data": data
        }))
