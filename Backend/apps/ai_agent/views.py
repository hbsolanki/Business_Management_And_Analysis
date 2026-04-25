from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.http import StreamingHttpResponse
from asgiref.sync import sync_to_async
import asyncio
import json

from apps.ai_agent.models import AiChatSession
from apps.base.views.base_view import BaseViewSet
from apps.ai_agent.serializers import AiChatSessionSerializer, AiChatMessageSerializer
from apps.ai_agent.utils.agent_runner import run_agent_session
from apps.subscription.utils.entitlements import can_use_feature
from apps.subscription.permissions import AIAgentFeaturePermission


class AiChatSessionViewSet(BaseViewSet, ModelViewSet):
    permission_classes = [AIAgentFeaturePermission]
    serializer_class = AiChatSessionSerializer

    def get_queryset(self):
        return AiChatSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(methods=["get"], detail=True, url_path="messages")
    def get_message_by_session_id(self, request, *args, **kwargs):
        session = self.get_object()
        messages = session.messages.all().order_by("-created_at")
        
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = AiChatMessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AiChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="stream")
    def stream(self, request, *args, **kwargs):
        """SSE streaming endpoint for AI Agent."""
        user = request.user
        query = request.data.get("query")
        session_id = request.data.get("session_id")

        if not query:
            return Response({"type": "error", "message": "No query provided."}, status=400)

        return StreamingHttpResponse(self._event_generator(user, query, session_id), content_type="text/event-stream")

    async def _event_generator(self, user, query, session_id):
        # 1. Subscription check
        allowed, _ = await sync_to_async(lambda: can_use_feature(user.business, "has_ai_agent"))()
        if not allowed:
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI Agent not available in your plan.'})}\n\n"
            return

        # 2. End-to-end orchestration
        queue = asyncio.Queue()
        async def callback(payload: dict):
            await queue.put(payload)
        
        task = asyncio.create_task(run_agent_session(user, query, session_id, callback))
        
        try:
            while True:
                payload = await queue.get()
                yield f"data: {json.dumps(payload)}\n\n"
                if payload.get("type") in ["done", "error"]:
                    break
        finally:
            if not task.done():
                task.cancel()


