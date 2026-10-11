import pytest
from unittest.mock import MagicMock, patch
from django.core.exceptions import ValidationError

from apps.ai_agent.utils.session_db import (
    get_or_create_session,
    save_message,
    create_assistant_message,
    finalize_assistant_message,
    update_last_assistant_message,
    get_user_context_data,
    get_session_title,
    create_chart_ref,
)
from apps.ai_agent.models import AiChatMessageSenderChoices


@pytest.mark.asyncio
class TestSessionDb:

    async def test_get_or_create_session(self):
        with patch("apps.user.models.User.all_objects.get") as m_user_get, \
             patch("apps.ai_agent.models.AiChatSession.objects.get") as m_sess_get, \
             patch("apps.ai_agent.models.AiChatSession.objects.create") as m_sess_create:

            mock_user = MagicMock(id=1)
            m_user_get.return_value = mock_user
            mock_sess = MagicMock(id="sess-1", title="Existing Chat")
            m_sess_get.return_value = mock_sess
            m_sess_create.return_value = MagicMock(id="sess-new", title="New Chat")

            # 1. Existing valid session
            sut_existing = await get_or_create_session(1, "sess-1")
            assert sut_existing.id == "sess-1"

            # 2. session_id is 'new' -> creates new
            sut_new = await get_or_create_session(1, "new")
            assert sut_new.id == "sess-new"

            # 3. session_id raises ValidationError/ValueError -> creates new
            m_sess_get.side_effect = ValidationError("Invalid UUID")
            sut_val_err = await get_or_create_session(1, "bad-id")
            assert sut_val_err.id == "sess-new"

            m_sess_get.side_effect = ValueError("Bad int")
            sut_val_err2 = await get_or_create_session(1, "bad-id-2")
            assert sut_val_err2.id == "sess-new"

    async def test_save_and_create_messages(self):
        with patch("apps.ai_agent.models.AiChatSession.objects.get") as m_sess_get, \
             patch("apps.ai_agent.models.AiChatMessage.objects.create") as m_msg_create:

            mock_sess = MagicMock(id="sess-1")
            m_sess_get.return_value = mock_sess
            mock_msg = MagicMock(id=10, content="Hello")
            m_msg_create.return_value = mock_msg

            # save_message
            sut_msg, is_dup = await save_message("sess-1", AiChatMessageSenderChoices.USER, "Hello")
            assert sut_msg.id == 10
            assert is_dup is False

            # create_assistant_message
            sut_asst = await create_assistant_message("sess-1")
            assert sut_asst.id == 10

    async def test_finalize_assistant_message(self):
        with patch("apps.ai_agent.models.AiChatMessage.objects.get") as m_msg_get:
            mock_sess = MagicMock(title="New Chat")
            mock_msg = MagicMock(id=10, session=mock_sess)
            m_msg_get.return_value = mock_msg

            # 1. Short content (< 10 chars)
            sut_short, renamed = await finalize_assistant_message(10, "Hi")
            assert renamed is False

            # 2. Long content (> 10 chars, < 60 chars)
            sut_med, renamed_med = await finalize_assistant_message(10, "# Detailed Analytics Overview\nHere is data")
            assert renamed_med is True
            assert mock_sess.title == "Detailed Analytics Overview"

            # 3. Very long content (> 60 chars)
            mock_sess.title = "New Chat"
            long_content = "This is an extremely long title that exceeds sixty characters easily without a doubt"
            sut_long, renamed_long = await finalize_assistant_message(10, long_content)
            assert renamed_long is True
            assert mock_sess.title.endswith("...")

            # 4. Session not named 'New Chat'
            mock_sess.title = "Custom Topic"
            sut_custom, renamed_custom = await finalize_assistant_message(10, "Some other message")
            assert renamed_custom is False

    async def test_update_last_assistant_message(self):
        with patch("apps.ai_agent.models.AiChatMessage.objects.filter") as m_filter:
            # 1. Message found
            mock_msg = MagicMock(id=20)
            m_filter.return_value.last.return_value = mock_msg
            sut_updated = await update_last_assistant_message("sess-1", "Updated streaming chunk")
            assert sut_updated.id == 20
            assert mock_msg.content == "Updated streaming chunk"

            # 2. Message not found
            m_filter.return_value.last.return_value = None
            sut_none = await update_last_assistant_message("sess-1", "No msg")
            assert sut_none is None

    async def test_get_user_context_data(self):
        with patch("apps.user.models.User.all_objects.get") as m_user_get:
            # 1. OWNER role
            user_owner = MagicMock(id=1, role_name="OWNER", business_id=10)
            m_user_get.return_value = user_owner
            role, biz_id, branch_id, uid = await get_user_context_data(1)
            assert role == "OWNER"
            assert biz_id == 10
            assert branch_id is None
            assert uid == "1"

            # 2. MANAGER role with branch
            branch_mock = MagicMock(id=5)
            user_mgr = MagicMock(id=2, role_name="MANAGER", business_id=10)
            user_mgr.branches.first.return_value = branch_mock
            m_user_get.return_value = user_mgr
            role, biz_id, branch_id, uid = await get_user_context_data(2)
            assert role == "MANAGER"
            assert branch_id == 5

            # 3. MANAGER role without branch
            user_mgr.branches.first.return_value = None
            role, biz_id, branch_id, uid = await get_user_context_data(2)
            assert branch_id is None

    async def test_get_session_title_and_create_chart_ref(self):
        with patch("apps.ai_agent.models.AiChatSession.objects.get") as m_sess_get, \
             patch("apps.ai_agent.models.AiChartRef.objects.create") as m_chart_create:

            m_sess_get.return_value = MagicMock(title="My Session Title")
            title = await get_session_title("sess-1")
            assert title == "My Session Title"

            m_chart_create.return_value = MagicMock(id=100, title="Sales Chart")
            chart = await create_chart_ref(
                message_id=1,
                title="Sales Chart",
                chart_type="vertical_bar",
                data=[{"x": 1}],
                option={"series": []}
            )
            assert chart.id == 100
