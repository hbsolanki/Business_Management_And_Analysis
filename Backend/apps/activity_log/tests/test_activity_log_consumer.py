import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from django.contrib.auth.models import AnonymousUser
from apps.activity_log.consumers import ActivityLogConsumer
from apps.employee.models import UserRole


@pytest.mark.asyncio
class TestActivityLogConsumer:

    def _setup_consumer(self, user=None):
        consumer = ActivityLogConsumer()
        consumer.scope = {"user": user if user is not None else AnonymousUser()}
        consumer.channel_layer = MagicMock()
        consumer.channel_layer.group_add = AsyncMock()
        consumer.channel_layer.group_discard = AsyncMock()
        consumer.channel_name = "channel_activity_test"
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

    async def test_connect_permission_denied_rejected(self):
        # Arrange
        user = MagicMock()
        user.is_anonymous = False
        sut_consumer = self._setup_consumer(user=user)

        # Act
        with patch.object(ActivityLogConsumer, "_get_user_context", AsyncMock(return_value={
            "has_permission": False,
            "business_id": 1,
            "role_name": UserRole.EMPLOYEE,
            "branch_ids": []
        })):
            await sut_consumer.connect()

        # Assert
        sut_consumer.close.assert_awaited_once()
        sut_consumer.accept.assert_not_called()

    async def test_connect_owner_success_and_receive_message(self):
        # Arrange
        user = MagicMock()
        user.is_anonymous = False
        sut_consumer = self._setup_consumer(user=user)

        # Act
        with patch.object(ActivityLogConsumer, "_get_user_context", AsyncMock(return_value={
            "has_permission": True,
            "business_id": 42,
            "role_name": UserRole.OWNER,
            "branch_ids": []
        })):
            await sut_consumer.connect()

        # Assert
        sut_consumer.accept.assert_awaited_once()
        assert "activity_logs_42" in sut_consumer.active_groups
        sut_consumer.channel_layer.group_add.assert_awaited_with("activity_logs_42", "channel_activity_test")

        # Act: activity_log_message
        await sut_consumer.activity_log_message({"data": {"action": "CREATE", "entity": "Product"}})
        sut_consumer.send.assert_awaited_once()
        payload = json.loads(sut_consumer.send.call_args[0][0])
        assert payload["type"] == "activity_log"
        assert payload["data"]["action"] == "CREATE"

        # Act: disconnect
        await sut_consumer.disconnect(1000)
        sut_consumer.channel_layer.group_discard.assert_awaited_with("activity_logs_42", "channel_activity_test")

    async def test_connect_manager_success_with_branches(self):
        # Arrange
        user = MagicMock()
        user.is_anonymous = False
        sut_consumer = self._setup_consumer(user=user)

        # Act
        with patch.object(ActivityLogConsumer, "_get_user_context", AsyncMock(return_value={
            "has_permission": True,
            "business_id": 42,
            "role_name": UserRole.MANAGER,
            "branch_ids": [101, 102]
        })):
            await sut_consumer.connect()

        # Assert
        sut_consumer.accept.assert_awaited_once()
        assert "activity_logs_branch_101" in sut_consumer.active_groups
        assert "activity_logs_branch_102" in sut_consumer.active_groups
        assert sut_consumer.channel_layer.group_add.await_count == 2

        # Act: disconnect
        await sut_consumer.disconnect(1000)
        assert sut_consumer.channel_layer.group_discard.await_count == 2

    async def test_disconnect_without_active_groups(self):
        # Arrange
        sut_consumer = self._setup_consumer()

        # Act & Assert (should not raise)
        await sut_consumer.disconnect(1000)

    @pytest.mark.django_db
    async def test_get_user_context_sync_method(self):
        # Arrange
        consumer = ActivityLogConsumer()
        mock_user = MagicMock()
        mock_user.has_perm.return_value = True
        mock_user.business_id = 99
        mock_user.role_name = UserRole.OWNER
        mock_user.branches.values_list.return_value = [1, 2]

        # Act
        ctx = await consumer._get_user_context(mock_user)

        # Assert
        assert ctx["has_permission"] is True
        assert ctx["business_id"] == 99
        assert ctx["role_name"] == UserRole.OWNER
        assert ctx["branch_ids"] == [1, 2]
