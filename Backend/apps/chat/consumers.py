import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from apps.chat.utils.presence import (
    set_user_online,
    refresh_user_online,
    set_user_offline,
    is_user_online,
)
from apps.chat.utils.chat_db_helper import (
    is_conversation_member,
    create_message,
    get_conversation_user_ids,
)
from apps.chat.serializers.message import MessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return

        self.user = user
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]

        @database_sync_to_async
        def get_user_biz_id(u):
            return u.business_id
            
        self.business_id = await get_user_biz_id(user)

        # Allow only conversation members
        if not await is_conversation_member(user.id, self.conversation_id):
            await self.close()
            return

        # Groups
        self.chat_group = f"chat_{self.conversation_id}"
        self.presence_group = f"presence_{self.business_id}"

        await self.channel_layer.group_add(self.chat_group, self.channel_name)
        await self.channel_layer.group_add(self.presence_group, self.channel_name)

        await self.accept()

        # Mark this user online
        set_user_online(self.business_id, user.id)

        # Send CURRENT presence of other user (initial sync)
        user_ids = await get_conversation_user_ids(self.conversation_id)
        for uid in user_ids:
            if uid == user.id:
                continue

            await self.send(json.dumps({
                "type": "user_status",
                "user_id": uid,
                "status": "online" if is_user_online(self.business_id, uid) else "offline",
            }))

        # Notify others that this user is online
        await self.channel_layer.group_send(
            self.presence_group,
            {
                "type": "presence.update",
                "user_id": user.id,
                "status": "online",
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "presence_group"):
            set_user_offline(self.business_id, self.user.id)

            await self.channel_layer.group_send(
                self.presence_group,
                {
                    "type": "presence.update",
                    "user_id": self.user.id,
                    "status": "offline",
                },
            )

            await self.channel_layer.group_discard(
                self.presence_group,
                self.channel_name,
            )

        if hasattr(self, "chat_group"):
            await self.channel_layer.group_discard(
                self.chat_group,
                self.channel_name,
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get("type")

        # Keep user online (heartbeat)
        if event_type == "ping":
            refresh_user_online(self.business_id, self.user.id)
            return

        # Typing indicator
        if event_type == "typing":
            await self.channel_layer.group_send(
                self.chat_group,
                {
                    "type": "typing.indicator",
                    "user_id": self.user.id,
                },
            )
            return

        # Chat message
        text = data.get("message")
        if not text:
            return

        message = await create_message(
            sender_id=self.user.id,
            conversation_id=self.conversation_id,
            text=text,
        )

        payload = MessageSerializer(message).data

        await self.channel_layer.group_send(
            self.chat_group,
            {
                "type": "chat.message",
                "data": payload
            },
        )

    async def chat_message(self, event):
        await self.send(json.dumps({
            "type": "chat_message",
            "data": event["data"]
        }))

    async def typing_indicator(self, event):
        await self.send(json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
        }))

    async def presence_update(self, event):
        await self.send(json.dumps({
            "type": "user_status",
            "user_id": event["user_id"],
            "status": event["status"],
        }))
