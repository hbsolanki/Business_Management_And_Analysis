import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from django.contrib.auth.models import AnonymousUser
from apps.chat.consumers import ChatConsumer


@pytest.mark.asyncio
class TestChatConsumer:

    def _setup_consumer(self, user=None, conversation_id=1):
        consumer = ChatConsumer()
        consumer.scope = {
            "user": user if user is not None else AnonymousUser(),
            "url_route": {"kwargs": {"conversation_id": conversation_id}},
        }
        consumer.channel_layer = MagicMock()
        consumer.channel_layer.group_add = AsyncMock()
        consumer.channel_layer.group_discard = AsyncMock()
        consumer.channel_layer.group_send = AsyncMock()
        consumer.channel_name = "test_chat_channel"
        consumer.accept = AsyncMock()
        consumer.close = AsyncMock()
        consumer.send = AsyncMock()
        return consumer

    async def test_connect_anonymous_rejected(self):
        # Arrange
        sut_consumer = self._setup_consumer(user=AnonymousUser())

        # Act
        await sut_consumer.connect()

        # Assert
        sut_consumer.close.assert_awaited_once()
        sut_consumer.accept.assert_not_called()

    async def test_connect_non_member_rejected(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, conversation_id=1)

        # Act
        with patch("apps.chat.consumers.is_conversation_member", AsyncMock(return_value=False)):
            await sut_consumer.connect()

        # Assert
        sut_consumer.close.assert_awaited_once()
        sut_consumer.accept.assert_not_called()

    async def test_connect_member_success(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, conversation_id=1)

        # Act
        with patch("apps.chat.consumers.is_conversation_member", AsyncMock(return_value=True)), \
             patch("apps.chat.consumers.set_user_online") as mock_set_online, \
             patch("apps.chat.consumers.get_conversation_user_ids", AsyncMock(return_value=[5, 6, 7])), \
             patch("apps.chat.consumers.is_user_online", side_effect=lambda biz_id, uid: uid == 6):
            await sut_consumer.connect()

        # Assert
        sut_consumer.accept.assert_awaited_once()
        assert sut_consumer.chat_group == "chat_1"
        assert sut_consumer.presence_group == "presence_10"
        mock_set_online.assert_called_once_with(10, 5)

        # Check initial sync sends for user 6 (online) and user 7 (offline)
        assert sut_consumer.send.await_count == 2
        payloads = [json.loads(call[0][0]) for call in sut_consumer.send.call_args_list]
        assert payloads[0] == {"type": "user_status", "user_id": 6, "status": "online"}
        assert payloads[1] == {"type": "user_status", "user_id": 7, "status": "offline"}

        # Check broadcast to presence group
        sut_consumer.channel_layer.group_send.assert_awaited_once_with(
            "presence_10",
            {"type": "presence.update", "user_id": 5, "status": "online"}
        )

    async def test_disconnect(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, conversation_id=1)
        sut_consumer.user = user
        sut_consumer.business_id = 10
        sut_consumer.presence_group = "presence_10"
        sut_consumer.chat_group = "chat_1"

        # Act
        with patch("apps.chat.consumers.set_user_offline") as mock_set_offline:
            await sut_consumer.disconnect(1000)

        # Assert
        mock_set_offline.assert_called_once_with(10, 5)
        sut_consumer.channel_layer.group_send.assert_awaited_once_with(
            "presence_10",
            {"type": "presence.update", "user_id": 5, "status": "offline"}
        )
        sut_consumer.channel_layer.group_discard.assert_any_await("presence_10", "test_chat_channel")
        sut_consumer.channel_layer.group_discard.assert_any_await("chat_1", "test_chat_channel")

    async def test_disconnect_clean_without_groups(self):
        # Arrange
        sut_consumer = self._setup_consumer()

        # Act & Assert (should not raise)
        await sut_consumer.disconnect(1000)

    async def test_receive_ping(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user)
        sut_consumer.user = user
        sut_consumer.business_id = 10

        # Act
        with patch("apps.chat.consumers.refresh_user_online") as mock_refresh:
            await sut_consumer.receive(json.dumps({"type": "ping"}))

        # Assert
        mock_refresh.assert_called_once_with(10, 5)

    async def test_receive_typing(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, conversation_id=1)
        sut_consumer.user = user
        sut_consumer.chat_group = "chat_1"

        # Act
        await sut_consumer.receive(json.dumps({"type": "typing"}))

        # Assert
        sut_consumer.channel_layer.group_send.assert_awaited_once_with(
            "chat_1",
            {"type": "typing.indicator", "user_id": 5}
        )

    async def test_receive_chat_message_empty(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, conversation_id=1)
        sut_consumer.user = user
        sut_consumer.chat_group = "chat_1"

        # Act
        await sut_consumer.receive(json.dumps({"type": "chat", "message": ""}))

        # Assert
        sut_consumer.channel_layer.group_send.assert_not_called()

    async def test_receive_chat_message_valid(self):
        # Arrange
        user = MagicMock(id=5, business_id=10, is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, conversation_id=1)
        sut_consumer.user = user
        sut_consumer.conversation_id = 1
        sut_consumer.chat_group = "chat_1"

        mock_msg = MagicMock()

        # Act
        with patch("apps.chat.consumers.create_message", AsyncMock(return_value=mock_msg)), \
             patch("apps.chat.consumers.MessageSerializer") as mock_ser:
            mock_ser.return_value.data = {"id": 100, "text": "Hello world"}
            await sut_consumer.receive(json.dumps({"type": "chat", "message": "Hello world"}))

        # Assert
        sut_consumer.channel_layer.group_send.assert_awaited_once_with(
            "chat_1",
            {"type": "chat.message", "data": {"id": 100, "text": "Hello world"}}
        )

    async def test_handlers(self):
        # Arrange
        sut_consumer = self._setup_consumer()

        # 1. chat_message handler
        await sut_consumer.chat_message({"data": {"id": 1, "text": "Hi"}})
        call_msg = json.loads(sut_consumer.send.call_args[0][0])
        assert call_msg == {"type": "chat_message", "data": {"id": 1, "text": "Hi"}}

        # 2. typing_indicator handler
        await sut_consumer.typing_indicator({"user_id": 42})
        call_typing = json.loads(sut_consumer.send.call_args[0][0])
        assert call_typing == {"type": "typing", "user_id": 42}

        # 3. presence_update handler
        await sut_consumer.presence_update({"user_id": 42, "status": "online"})
        call_presence = json.loads(sut_consumer.send.call_args[0][0])
        assert call_presence == {"type": "user_status", "user_id": 42, "status": "online"}
