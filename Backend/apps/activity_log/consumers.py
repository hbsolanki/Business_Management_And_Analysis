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

        has_permission = await database_sync_to_async(user.has_perm)("activity_log.view_activitylog")
        if not has_permission:
            await self.close()
            return


        self.user = user
        self.business_id = user.business_id
        self.active_groups = []

        if user.role_name == UserRole.OWNER:
            # Owners see everything in their business
            self.active_groups.append(f"activity_logs_{self.business_id}")
        elif user.role_name in (UserRole.MANAGER, UserRole.EMPLOYEE):
            # Managers and Employees see only their assigned branches
            branch_ids = await self._get_branch_ids(user)
            for b_id in branch_ids:
                self.active_groups.append(f"activity_logs_branch_{b_id}")

        for group in self.active_groups:
            await self.channel_layer.group_add(
                group,
                self.channel_name
            )

        await self.accept()

    @database_sync_to_async
    def _get_branch_ids(self, user):
        return list(user.branches.values_list('id', flat=True))

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
