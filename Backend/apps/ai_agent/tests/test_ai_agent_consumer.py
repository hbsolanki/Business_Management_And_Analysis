import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from django.contrib.auth.models import AnonymousUser
from apps.ai_agent.consumers import AiAgentConsumer


@pytest.mark.asyncio
class TestAiAgentConsumer:

    def _setup_consumer(self, user=None, session_id="test-session-123"):
        consumer = AiAgentConsumer()
        consumer.scope = {
            "user": user if user is not None else AnonymousUser(),
            "url_route": {"kwargs": {"session_id": session_id}},
        }
        consumer.channel_layer = MagicMock()
        consumer.channel_layer.group_add = AsyncMock()
        consumer.channel_layer.group_discard = AsyncMock()
        consumer.channel_name = "test_ai_channel"
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

    async def test_connect_no_user_rejected(self):
        # Arrange
        consumer = AiAgentConsumer()
        consumer.scope = {"user": None, "url_route": {"kwargs": {"session_id": "123"}}}
        consumer.close = AsyncMock()
        consumer.accept = AsyncMock()

        # Act
        await consumer.connect()

        # Assert
        consumer.close.assert_awaited_once()
        consumer.accept.assert_not_called()

    @pytest.mark.django_db
    async def test_connect_user_no_business_rejected(self):
        # Arrange
        user = MagicMock(username="nobiz_user", is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user)

        with patch("apps.employee.models.UserBusinessRole.objects.filter") as m_role:
            m_role.return_value.first.return_value = None

            # Act
            await sut_consumer.connect()

            # Assert
            sut_consumer.close.assert_awaited_once()
            sut_consumer.accept.assert_not_called()

    @pytest.mark.django_db
    async def test_connect_success(self):
        # Arrange
        user = MagicMock(username="biz_user", is_anonymous=False)
        sut_consumer = self._setup_consumer(user=user, session_id="sess-abc")

        mock_role = MagicMock(business_id=15, role="OWNER")
        mock_branch = MagicMock(id=25)

        with patch("apps.employee.models.UserBusinessRole.objects.filter") as m_role, \
             patch("apps.business.models.Branch.objects.filter") as m_branch:
            m_role.return_value.first.return_value = mock_role
            m_branch.return_value.first.return_value = mock_branch

            # Act
            await sut_consumer.connect()

            # Assert
            sut_consumer.accept.assert_awaited_once()
            assert sut_consumer.business_id == 15
            assert sut_consumer.branch_id == 25
            assert sut_consumer.role == "OWNER"
            assert sut_consumer.session_group == "ai_agent_session_sess-abc"
            sut_consumer.channel_layer.group_add.assert_awaited_once_with(
                "ai_agent_session_sess-abc", "test_ai_channel"
            )

    async def test_disconnect(self):
        # Arrange
        sut_consumer = self._setup_consumer(session_id="sess-abc")
        sut_consumer.session_group = "ai_agent_session_sess-abc"

        # Act
        await sut_consumer.disconnect(1000)

        # Assert
        sut_consumer.channel_layer.group_discard.assert_awaited_once_with(
            "ai_agent_session_sess-abc", "test_ai_channel"
        )

    async def test_disconnect_clean_without_session_group(self):
        # Arrange
        sut_consumer = self._setup_consumer()

        # Act & Assert (should not raise)
        await sut_consumer.disconnect(1000)

    async def test_receive_confirm_assignment_cancelled(self):
        # Arrange
        user = MagicMock(id=1, username="test_u")
        sut_consumer = self._setup_consumer(user=user, session_id="sess-123")
        sut_consumer.business_id = 10
        sut_consumer.branch_id = 20
        sut_consumer.role = "OWNER"
        sut_consumer.user = user
        sut_consumer.session_id = "sess-123"

        msg = json.dumps({"type": "confirm_assignment", "confirm": False})

        # Act
        with patch("apps.ai_agent.utils.session_db.update_last_assistant_message", AsyncMock()) as m_update:
            await sut_consumer.receive(msg)

        # Assert
        m_update.assert_awaited_once_with("sess-123", "Assignment cancelled by user.")
        res = json.loads(sut_consumer.send.call_args[0][0])
        assert res["type"] == "assignment_result"
        assert res["success"] is False
        assert "cancelled" in res["message"]

    async def test_receive_confirm_assignment_success(self):
        # Arrange
        user = MagicMock(id=1, username="test_u")
        sut_consumer = self._setup_consumer(user=user, session_id="sess-123")
        sut_consumer.business_id = 10
        sut_consumer.branch_id = 20
        sut_consumer.role = "OWNER"
        sut_consumer.user = user
        sut_consumer.session_id = "sess-123"

        msg = json.dumps({
            "type": "confirm_assignment",
            "confirm": True,
            "entity_type": "task_employee",
            "source_id": 5,
            "target_id": 10
        })

        # Act
        with patch("apps.ai_agent.utils.session_db.update_last_assistant_message", AsyncMock()) as m_update, \
             patch("apps.ai_agent.consumers.execute_assignment", AsyncMock(return_value={"success": True, "message": "Done!"})):
            await sut_consumer.receive(msg)

        # Assert
        m_update.assert_awaited_once_with("sess-123", "Done!")
        res = json.loads(sut_consumer.send.call_args[0][0])
        assert res["type"] == "assignment_result"
        assert res["success"] is True
        assert res["message"] == "Done!"

    async def test_receive_confirm_assignment_failure(self):
        # Arrange
        user = MagicMock(id=1, username="test_u")
        sut_consumer = self._setup_consumer(user=user, session_id="sess-123")
        sut_consumer.business_id = 10
        sut_consumer.branch_id = 20
        sut_consumer.role = "OWNER"
        sut_consumer.user = user
        sut_consumer.session_id = "sess-123"

        msg = json.dumps({
            "type": "confirm_assignment",
            "confirm": True,
            "entity_type": "task_employee",
            "source_id": 5,
            "target_id": 10
        })

        # Act
        with patch("apps.ai_agent.consumers.execute_assignment", AsyncMock(return_value={"error": "Something went wrong"})):
            await sut_consumer.receive(msg)

        # Assert
        res = json.loads(sut_consumer.send.call_args[0][0])
        assert res["type"] == "assignment_result"
        assert res["success"] is False
        assert res["message"] == "Something went wrong"

    async def test_receive_query_session_existing(self):
        # Arrange
        user = MagicMock(id=1, username="test_u")
        sut_consumer = self._setup_consumer(user=user, session_id="sess-123")
        sut_consumer.business_id = 10
        sut_consumer.branch_id = 20
        sut_consumer.role = "OWNER"
        sut_consumer.user = user
        sut_consumer.session_id = "sess-123"

        msg = json.dumps({"type": "query", "query": "Top products", "agent": "analytics"})

        # Act
        with patch("apps.ai_agent.utils.agent_runner.run_agent_session", AsyncMock()) as m_run:
            await sut_consumer.receive(msg)

            # Assert
            m_run.assert_awaited_once()
            call_kwargs = m_run.call_args.kwargs
            assert call_kwargs["session_id"] == "sess-123"
            assert call_kwargs["query"] == "Top products"
            assert call_kwargs["agent_name"] == "analytics"

            # Test callback execution
            send_fn = call_kwargs["send_fn"]
            await send_fn({"reply": "here is data"})
            sut_consumer.send.assert_awaited_once()
            res = json.loads(sut_consumer.send.call_args[0][0])
            assert res["reply"] == "here is data"

    async def test_receive_query_session_new(self):
        # Arrange
        user = MagicMock(id=1, username="test_u")
        sut_consumer = self._setup_consumer(user=user, session_id="new")
        sut_consumer.business_id = 10
        sut_consumer.branch_id = 20
        sut_consumer.role = "OWNER"
        sut_consumer.user = user
        sut_consumer.session_id = "new"

        msg = json.dumps({"type": "query", "query": "Hello", "agent": "manage"})

        # Act
        with patch("apps.ai_agent.utils.agent_runner.run_agent_session", AsyncMock()) as m_run:
            await sut_consumer.receive(msg)

            # Assert
            m_run.assert_awaited_once()
            call_kwargs = m_run.call_args.kwargs
            assert call_kwargs["session_id"] is None
            assert call_kwargs["query"] == "Hello"
            assert call_kwargs["agent_name"] == "manage"

    async def test_receive_exception_handling(self):
        # Arrange
        sut_consumer = self._setup_consumer()

        # Act - invalid JSON
        await sut_consumer.receive("invalid json {")

        # Assert
        sut_consumer.send.assert_awaited_once()
        res = json.loads(sut_consumer.send.call_args[0][0])
        assert res["type"] == "error"
        assert "Server processing error" in res["message"]
