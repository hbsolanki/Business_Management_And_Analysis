from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.ai_agent.models import AiChatSession
from apps.base.views.base_view import BaseViewSet
from apps.ai_agent.serializers import AiChatSessionSerializer, AiChatMessageSerializer
from apps.subscription.permissions import AIAgentFeaturePermission
from apps.ai_agent.pagination import AiAgentCursorPagination


class AiChatSessionViewSet(BaseViewSet, ModelViewSet):
    permission_classes = [AIAgentFeaturePermission]
    serializer_class = AiChatSessionSerializer
    pagination_class = AiAgentCursorPagination

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



