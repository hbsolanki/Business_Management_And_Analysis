from rest_framework import status
from rest_framework.mixins import DestroyModelMixin,UpdateModelMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.core.cache import cache
from django.http import Http404

from apps.base.views.base_view import BaseViewSet
from drf_spectacular.utils import extend_schema
from apps.chat.models import Conversation, Message
from apps.chat.serializers.message import MessageSerializer, MessageMediaUploadSerializer
from apps.chat.pagination import ChatCursorPagination
from apps.master.utils.cache import make_cache_key
from apps.base.permission.model_permissions import ModelPermissions
from apps.subscription.permissions import ChatFeaturePermission
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework.parsers import MultiPartParser, FormParser


from apps.base.serializers.bulk import BulkIdSerializer

class MessagesViewSet(BaseViewSet,UpdateModelMixin,DestroyModelMixin):
    permission_classes = [ModelPermissions,ChatFeaturePermission]
    pagination_class = ChatCursorPagination
    queryset = Message.objects.none()

    def get_serializer_class(self):
        if self.action == "message_media_upload":
            return MessageMediaUploadSerializer
        return MessageSerializer

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(sender=user)

    def create(self, request, *args, **kwargs):
        return Response({"error": "Message creation Not Allow"},status=status.HTTP_400_BAD_REQUEST)

    def perform_update(self, serializer):
        serializer.save(is_updated=True)

    @action(detail=False, methods=["get"],url_path=r"conversation/(?P<conversation_id>\d+)")
    def by_conversation(self, request, conversation_id=None):
        try:
            cache_key = make_cache_key(request,"chat",f":conversation:{conversation_id}",request.user)
            cache_data = cache.get(cache_key)

            if cache_data:
                return Response(cache_data,status=status.HTTP_200_OK)

            conversation = Conversation.objects.filter(id=conversation_id).filter(Q(user1=request.user) | Q(user2=request.user)).first()

            if not conversation:
                raise PermissionDenied("Not part of this conversation")

            messages_qs = (Message.objects.filter(conversation=conversation).select_related("sender"))

            page = self.paginate_queryset(messages_qs)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                response=self.get_paginated_response(serializer.data)
                cache.set(cache_key, response.data, timeout=60 * 2)
                return response

            serializer = self.get_serializer(messages_qs, many=True)
            cache.set(cache_key, serializer.data, timeout=60*2)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except (Http404, PermissionDenied):
            raise
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Upload Media to Conversation",
        description="Upload an image, video, or file. Supports multipart/form-data. In Swagger, use the 'Choose File' button below.",
        request=MessageMediaUploadSerializer,
        responses={201: MessageSerializer}
    )
    @action(detail=False, methods=["post"], url_path=r"conversation/(?P<conversation_id>\d+)/upload",parser_classes=[MultiPartParser, FormParser])
    def message_media_upload(self, request, conversation_id=None):
        try:
            conversation = Conversation.objects.filter(id=conversation_id).filter(
                Q(user1=request.user) | Q(user2=request.user)).first()

            if not conversation:
                raise PermissionDenied("Not part of this conversation")

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            file = serializer.validated_data.get("media")
            
            # Use Manager to create message
            message = Message.objects.create_message(
                conversation=conversation,
                sender=request.user,
                media=file
            )

            data = MessageSerializer(message).data

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{conversation.id}",
                {
                    "type": "chat.message",
                    "data": data
                }
            )

            return Response(data, status=status.HTTP_201_CREATED)
        except (Http404, PermissionDenied):
            raise
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        try:
            serializer = BulkIdSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            ids = serializer.validated_data["ids"]

            # Check if any messages do not belong to the sender
            if Message.objects.filter(id__in=ids).exclude(sender=request.user).exists():
                raise PermissionDenied("You can only delete your own messages")

            Message.objects.filter(
                id__in=ids,
                sender=request.user
            ).delete()

            return Response(
                {"detail": "Messages deleted successfully"},
                status=status.HTTP_200_OK
            )
        except (Http404, PermissionDenied):
            raise
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
