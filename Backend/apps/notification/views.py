import json
import asyncio
import uuid
from django.http import StreamingHttpResponse
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
from rest_framework.permissions import IsAuthenticated

from apps.base.permission.model_permissions import ModelPermissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet,mixins
from apps.notification.models import Notification
from apps.notification.serializers import NotificationReadSerializer
from apps.base.serializers.base import BulkIdSerializer

class NotificationViewSet(GenericViewSet,mixins.ListModelMixin,mixins.DestroyModelMixin):
    permission_classes = [ModelPermissions]
    serializer_class = NotificationReadSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(methods=["post"], detail=True, url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(
            {"detail": "Notification marked as read"},
            status=status.HTTP_200_OK
        )

    @action(methods=["post"], detail=False, url_path="bulk-mark-read")
    def bulk_mark_read(self, request):
        serializer = BulkIdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data["ids"]

        Notification.objects.filter(
            id__in=ids,
            user=request.user,
            is_read=False
        ).update(is_read=True)

        return Response(
            {"detail": "Notifications marked as read"},
            status=status.HTTP_200_OK
        )

    @action(methods=["post"], detail=False, url_path="bulk-delete")
    def bulk_delete(self, request):
        serializer = BulkIdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data["ids"]

        Notification.objects.filter(
            id__in=ids,
            user=request.user
        ).delete()
        return Response(
            {"detail": "Notifications deleted successfully"},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"], url_path="stream", permission_classes=[IsAuthenticated])
    def stream(self, request, *args, **kwargs):
        """SSE streaming endpoint for notifications."""
        return StreamingHttpResponse(self._event_generator(request.user), content_type="text/event-stream")

    async def _event_generator(self, user):
        channel_layer = get_channel_layer()
        if not channel_layer:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Channel layer not configured'})}\n\n"
            return
            
        channel_name = await channel_layer.new_channel()
        
        # Get branch IDs for group subscription
        branch_ids = await sync_to_async(lambda: list(user.branches.values_list('id', flat=True)))()
        
        active_groups = [f"notification_{user.id}", "broadcast"]
        for b_id in branch_ids:
            active_groups.append(f"notification_branch_{b_id}")
            
        for group in active_groups:
            await channel_layer.group_add(group, channel_name)
            
        try:
            # Send an initial connection event
            yield f"data: {json.dumps({'type': 'connection', 'status': 'connected'})}\n\n"
            
            while True:
                # Wait for a message with a timeout to allow checking if the connection is still alive
                try:
                    message = await asyncio.wait_for(channel_layer.receive(channel_name), timeout=30.0)
                    if message.get("type") == "notification":
                        # Clean message for client
                        clean_message = {k: v for k, v in message.items() if k != "type"}
                        yield f"data: {json.dumps(clean_message)}\n\n"
                except asyncio.TimeoutError:
                    # Send a keep-alive comment
                    yield ": keep-alive\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            for group in active_groups:
                await channel_layer.group_discard(group, channel_name)

