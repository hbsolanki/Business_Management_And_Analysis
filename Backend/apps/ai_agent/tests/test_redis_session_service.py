import datetime
import pickle
import types
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from google.adk.events.event import Event
from google.adk.sessions.base_session_service import GetSessionConfig
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.sessions.session import Session

from apps.ai_agent.services.redis_session_service import (
    RedisSessionService,
    _json_safe,
    _sanitize_event,
    get_session_service,
)


class TestJsonSafeAndSanitize:
    def test_json_safe_primitives_and_types(self):
        # Arrange
        now = datetime.datetime.now()
        today = datetime.date.today()
        test_uuid = uuid.uuid4()
        test_decimal = Decimal("42.50")
        nested_data = {
            "dec": test_decimal,
            "uid": test_uuid,
            "dt": now,
            "d": today,
            "nested_list": [Decimal("1.2"), (test_uuid, "str")],
            "plain_int": 100,
        }

        # Act
        sut_res = _json_safe(nested_data)

        # Assert
        assert sut_res["dec"] == 42.5
        assert sut_res["uid"] == str(test_uuid)
        assert sut_res["dt"] == str(now)
        assert sut_res["d"] == str(today)
        assert sut_res["nested_list"][0] == 1.2
        assert sut_res["nested_list"][1] == [str(test_uuid), "str"]
        assert sut_res["plain_int"] == 100

    def test_sanitize_event_empty_or_no_parts(self):
        # Arrange
        mock_event_empty = types.SimpleNamespace(content=None)
        mock_event_no_parts = types.SimpleNamespace(content=types.SimpleNamespace(parts=[]))

        # Act
        sut_res1 = _sanitize_event(mock_event_empty)
        sut_res2 = _sanitize_event(mock_event_no_parts)

        # Assert
        assert sut_res1 is mock_event_empty
        assert sut_res2 is mock_event_no_parts

    def test_sanitize_event_with_function_response(self):
        # Arrange
        fr = types.SimpleNamespace(response={"val": Decimal("10.5"), "arr": [Decimal("2.5")]})
        part = types.SimpleNamespace(function_response=fr)
        mock_event = types.SimpleNamespace(content=types.SimpleNamespace(parts=[part]))

        # Act
        sut_res = _sanitize_event(mock_event)

        # Assert
        assert sut_res.content.parts[0].function_response.response == {"val": 10.5, "arr": [2.5]}

    def test_sanitize_event_exception_handled_gracefully(self):
        # Arrange
        class BadEvent:
            @property
            def content(self):
                raise RuntimeError("Corrupted")

        bad_event = BadEvent()

        # Act
        sut_res = _sanitize_event(bad_event)

        # Assert
        assert sut_res is bad_event


class TestGetSessionServiceFactory:
    def test_get_session_service_without_url(self):
        # Arrange
        redis_url = None

        # Act
        sut_service = get_session_service(redis_url=redis_url)

        # Assert
        assert isinstance(sut_service, InMemorySessionService)

    @patch("apps.ai_agent.services.redis_session_service.redis.from_url")
    def test_get_session_service_with_url(self, mock_from_url):
        # Arrange
        redis_url = "redis://localhost:6379/0"

        # Act
        sut_service = get_session_service(redis_url=redis_url)

        # Assert
        assert isinstance(sut_service, RedisSessionService)
        assert sut_service.redis_url == redis_url


@pytest.mark.asyncio
class TestRedisSessionService:
    @pytest.fixture
    def mock_redis_service(self):
        with patch("apps.ai_agent.services.redis_session_service.redis.from_url") as mock_from_url:
            mock_client = MagicMock()
            mock_client.get = AsyncMock()
            mock_client.smembers = AsyncMock()
            mock_client.aclose = AsyncMock()

            mock_pipeline = MagicMock()
            mock_pipeline.set = MagicMock()
            mock_pipeline.sadd = MagicMock()
            mock_pipeline.expire = MagicMock()
            mock_pipeline.delete = MagicMock()
            mock_pipeline.srem = MagicMock()
            mock_pipeline.execute = AsyncMock()
            mock_pipeline.__aenter__ = AsyncMock(return_value=mock_pipeline)
            mock_pipeline.__aexit__ = AsyncMock(return_value=None)

            mock_client.pipeline.return_value = mock_pipeline
            mock_from_url.return_value = mock_client

            service = RedisSessionService(redis_url="redis://dummy:6379", expire_seconds=3600)
            service._redis = mock_client
            yield service, mock_client, mock_pipeline

    async def test_session_keys(self, mock_redis_service):
        # Arrange
        service, _, _ = mock_redis_service

        # Act
        sut_s_key = service._session_key("bma_app", "user_1", "sess_1")
        sut_l_key = service._list_key("bma_app", "user_1")

        # Assert
        assert sut_s_key == "agent_session:bma_app:user_1:sess_1"
        assert sut_l_key == "agent_sessions_list:bma_app:user_1"

    async def test_create_session(self, mock_redis_service):
        # Arrange
        service, _, pipeline = mock_redis_service

        # Act
        sut_session = await service.create_session(
            app_name="bma_app",
            user_id="user_1",
            state={"step": 1},
            session_id="custom_id_123",
        )

        # Assert
        assert sut_session.id == "custom_id_123"
        assert sut_session.app_name == "bma_app"
        assert sut_session.user_id == "user_1"
        assert sut_session.state == {"step": 1}
        pipeline.set.assert_called_once()
        pipeline.sadd.assert_called_once()
        pipeline.execute.assert_called_once()

    async def test_get_session_not_found(self, mock_redis_service):
        # Arrange
        service, mock_client, _ = mock_redis_service
        mock_client.get.return_value = None

        # Act
        sut_session = await service.get_session(app_name="bma", user_id="u1", session_id="s1")

        # Assert
        assert sut_session is None

    async def test_get_session_with_config_filtering(self, mock_redis_service):
        # Arrange
        service, mock_client, _ = mock_redis_service
        event1 = Event(author="user", timestamp=100.0)
        event2 = Event(author="user", timestamp=200.0)
        event3 = Event(author="user", timestamp=300.0)

        stored_session = Session(
            app_name="bma",
            user_id="u1",
            id="s1",
            state={},
            events=[event1, event2, event3],
        )
        mock_client.get.return_value = pickle.dumps(stored_session)
        config = GetSessionConfig(num_recent_events=2, after_timestamp=150.0)

        # Act
        sut_session = await service.get_session(
            app_name="bma",
            user_id="u1",
            session_id="s1",
            config=config,
        )

        # Assert
        assert sut_session is not None
        assert len(sut_session.events) == 2
        assert sut_session.events[0].timestamp == 200.0
        assert sut_session.events[1].timestamp == 300.0

    async def test_list_sessions_with_user_id(self, mock_redis_service):
        # Arrange
        service, mock_client, _ = mock_redis_service
        mock_client.smembers.return_value = [b"sess_1", "sess_2"]

        event = Event(author="user")
        sess1 = Session(app_name="bma", user_id="u1", id="sess_1", state={}, events=[event])
        sess2 = Session(app_name="bma", user_id="u1", id="sess_2", state={}, events=[event])

        async def fake_get_session(app_name, user_id, session_id, config=None):
            if session_id == "sess_1":
                return sess1
            elif session_id == "sess_2":
                return sess2
            return None

        service.get_session = AsyncMock(side_effect=fake_get_session)

        # Act
        sut_res = await service.list_sessions(app_name="bma", user_id="u1")

        # Assert
        assert len(sut_res.sessions) == 2
        assert sut_res.sessions[0].events == []
        assert sut_res.sessions[1].events == []

    async def test_list_sessions_without_user_id(self, mock_redis_service):
        # Arrange
        service, _, _ = mock_redis_service

        # Act
        sut_res = await service.list_sessions(app_name="bma", user_id=None)

        # Assert
        assert sut_res.sessions == []

    async def test_delete_session(self, mock_redis_service):
        # Arrange
        service, _, pipeline = mock_redis_service

        # Act
        await service.delete_session(app_name="bma", user_id="u1", session_id="s1")

        # Assert
        pipeline.delete.assert_called_once_with("agent_session:bma:u1:s1")
        pipeline.srem.assert_called_once_with("agent_sessions_list:bma:u1", "s1")
        pipeline.execute.assert_called_once()

    async def test_append_event_partial_skipped(self, mock_redis_service):
        # Arrange
        service, _, _ = mock_redis_service
        mock_session = Session(app_name="bma", user_id="u1", id="s1", state={}, events=[])
        event = Event(author="user", partial=True)
        service._save_session = AsyncMock()

        # Act
        sut_event = await service.append_event(mock_session, event)

        # Assert
        assert sut_event is event
        service._save_session.assert_not_called()

    async def test_append_event_persisted(self, mock_redis_service):
        # Arrange
        service, _, _ = mock_redis_service
        mock_session = Session(app_name="bma", user_id="u1", id="s1", state={}, events=[])
        event = Event(author="user", partial=False)
        service._save_session = AsyncMock()

        # Act
        sut_event = await service.append_event(mock_session, event)

        # Assert
        assert sut_event is event
        assert event in mock_session.events
        service._save_session.assert_called_once_with(mock_session)

    async def test_close(self, mock_redis_service):
        # Arrange
        service, mock_client, _ = mock_redis_service

        # Act
        await service.close()

        # Assert
        mock_client.aclose.assert_called_once()
