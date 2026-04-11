from django.db import transaction
from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet

from apps.base.views.base_view import BaseViewSet
from apps.chat.models import Conversation
from apps.chat.serializers.conversation import (ConversationGetOrCreateSerializer,
                                                ConversationReadSerializer)
from django.db.models import Q
from apps.chat.pagination import ChatCursorPagination
from rest_framework.decorators import action
from django.core.cache import cache
from apps.master.utils.cache import make_cache_key, invalidate_cache
from apps.base.permission.model_permissions import ModelPermissions
from apps.subscription.permissions import ChatFeaturePermission
from apps.base.serializers.base import BulkIdSerializer


class ConversationViewSet(BaseViewSet,ModelViewSet):
    permission_classes = [ModelPermissions,ChatFeaturePermission]
    pagination_class = ChatCursorPagination

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects
            .filter(Q(user1=user) | Q(user2=user))
            .select_related("user1", "user2")
        )


    def get_serializer_class(self):
        if self.action=="create":
            return ConversationGetOrCreateSerializer
        elif self.action=="bulk_delete":
            return BulkIdSerializer

        return ConversationReadSerializer

    def list(self, request, *args, **kwargs):
        cache_key = make_cache_key(request, "chat", "conversation_list", request.user)

        if cached := cache.get(cache_key):
            return Response(cached, status=status.HTTP_200_OK)

        queryset = self.filter_queryset(self.get_queryset().order_by("-updated_at", "-id"))
        page = self.paginate_queryset(queryset)

        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        response = self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data, status=status.HTTP_200_OK)

        cache.set(cache_key, response.data, 20)
        return response

    @action(detail=False, methods=["post"],url_path="bulk-delete",url_name="bulk-delete")
    @transaction.atomic
    def bulk_delete(self,request):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]

        # Only delete if user is part of the conversation
        Conversation.objects.filter(
            id__in=ids
        ).filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).delete()

        invalidate_cache("chat", "conversation_list", self.request.user)

        return Response(
            {"detail": "Conversations deleted successfully", "ids": ids},
            status=status.HTTP_200_OK
        )
