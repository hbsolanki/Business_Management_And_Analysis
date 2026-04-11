import uuid
import pickle
from typing import Any, Optional
import redis.asyncio as redis

from google.adk.sessions.base_session_service import BaseSessionService, GetSessionConfig, ListSessionsResponse
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.sessions.session import Session
from google.adk.events.event import Event


class RedisSessionService(BaseSessionService):
    """Redis-backed session service for AI agent persistence."""

    def __init__(self, redis_url: str, expire_seconds: int = 3600 * 24):
        self.redis_url = redis_url
        self.expire_seconds = expire_seconds
        self._redis = redis.from_url(redis_url)

    # Key helpers
    def _session_key(self, app_name: str, user_id: str, session_id: str) -> str:
        return f"agent_session:{app_name}:{user_id}:{session_id}"

    def _list_key(self, app_name: str, user_id: str) -> str:
        return f"agent_sessions_list:{app_name}:{user_id}"

    # Core operations
    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        session = Session(
            app_name=app_name,
            user_id=user_id,
            id=session_id or str(uuid.uuid4()),
            state=state or {},
            events=[],
        )
        await self._save_session(session)
        return session

    async def _save_session(self, session: Session) -> None:
        key = self._session_key(session.app_name, session.user_id, session.id)
        list_key = self._list_key(session.app_name, session.user_id)
        data = pickle.dumps(session)
        async with self._redis.pipeline() as pipe:
            pipe.set(key, data, ex=self.expire_seconds)
            pipe.sadd(list_key, session.id)
            pipe.expire(list_key, self.expire_seconds)
            await pipe.execute()

    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: Optional[GetSessionConfig] = None,
    ) -> Optional[Session]:
        data = await self._redis.get(self._session_key(app_name, user_id, session_id))
        if not data:
            return None
        session = pickle.loads(data)
        if config:
            if config.num_recent_events:
                session.events = session.events[-config.num_recent_events:]
            if config.after_timestamp:
                session.events = [e for e in session.events if e.timestamp >= config.after_timestamp]
        return session

    async def list_sessions(
        self, *, app_name: str, user_id: Optional[str] = None
    ) -> ListSessionsResponse:
        sessions = []
        if user_id:
            session_ids = await self._redis.smembers(self._list_key(app_name, user_id))
            for sid in session_ids:
                sid_str = sid.decode() if isinstance(sid, bytes) else sid
                session = await self.get_session(app_name=app_name, user_id=user_id, session_id=sid_str)
                if session:
                    session.events = []
                    sessions.append(session)
        return ListSessionsResponse(sessions=sessions)

    async def delete_session(
        self, *, app_name: str, user_id: str, session_id: str
    ) -> None:
        async with self._redis.pipeline() as pipe:
            pipe.delete(self._session_key(app_name, user_id, session_id))
            pipe.srem(self._list_key(app_name, user_id), session_id)
            await pipe.execute()

    async def append_event(self, session: Session, event: Event) -> Event:
        if event.partial:
            return event
        await super().append_event(session, event)
        await self._save_session(session)
        return event

    async def close(self) -> None:
        await self._redis.aclose()


def get_session_service(redis_url: Optional[str] = None) -> BaseSessionService:
    """Return a RedisSessionService if a URL is provided, else InMemorySessionService."""
    if redis_url:
        return RedisSessionService(redis_url=redis_url)
    return InMemorySessionService()
