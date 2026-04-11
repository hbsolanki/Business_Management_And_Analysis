import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return

        self.user = user
        self.active_groups = [f"notification_{user.id}", "broadcast"]

        branch_ids = await self._get_branch_ids(user)
        for b_id in branch_ids:
            self.active_groups.append(f"notification_branch_{b_id}")

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

    async def notification(self, event):
        event.pop("type", None)

        await self.send(json.dumps({
            "type": "notification",
            **event
        }))
