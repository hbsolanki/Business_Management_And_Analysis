import json
import asyncio
from django.http import StreamingHttpResponse
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
from rest_framework.permissions import IsAuthenticated

from apps.base.permission.model_permissions import ModelPermissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.viewsets import mixins, ModelViewSet
from apps.notification.models import Notification, Reminder, ReminderLink
from apps.notification.serializers import NotificationReadSerializer, ReminderSerializer, ReminderLinkSerializer
from apps.notification.filters import ReminderFilter

from apps.base.views.base_view import BaseViewSet

class NotificationViewSet(BaseViewSet, mixins.ListModelMixin, mixins.DestroyModelMixin):
    permission_classes = [ModelPermissions]
    serializer_class = NotificationReadSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(methods=["post"], detail=True, url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"detail": "Notification marked as read"}, status=status.HTTP_200_OK)

    @action(methods=["post"], detail=False, url_path="bulk-mark-read")
    def bulk_mark_read(self, request):
        self.get_queryset().filter(id__in=request.data.get("ids", []), is_read=False).update(is_read=True)
        return Response({"detail": "Notifications marked as read"}, status=status.HTTP_200_OK)

    @action(methods=["post"], detail=False, url_path="bulk-delete")
    def bulk_delete(self, request):
        self.get_queryset().filter(id__in=request.data.get("ids", [])).delete()
        return Response({"detail": "Notifications deleted successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="stream", permission_classes=[IsAuthenticated])
    def stream(self, request, *args, **kwargs):
        """SSE streaming endpoint for notifications."""
        response = StreamingHttpResponse(self._event_generator(request.user), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        response["Connection"] = "keep-alive"
        return response

    async def _event_generator(self, user):
        channel_layer = get_channel_layer()
        if not channel_layer:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Channel layer not configured'})}\n\n"
            return
            
        channel_name = await channel_layer.new_channel()
        
        # Get branch IDs for group subscription
        branch_ids = await sync_to_async(lambda: list(user.assigned_branches.values_list('branch_id', flat=True)))()
        
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




class ReminderViewSet(BaseViewSet, ModelViewSet):
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    filterset_class = ReminderFilter

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user).prefetch_related("links")

    @action(detail=True, methods=["get"], url_path="links")
    def list_links(self, request, pk=None):
        """Return all entity links attached to this reminder."""
        reminder = self.get_object()
        links = ReminderLink.objects.filter(reminder=reminder).select_related("content_type")
        serializer = ReminderLinkSerializer(links, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path="links/(?P<link_pk>[^/.]+)")
    def delete_link(self, request, pk=None, link_pk=None):
        """Remove a specific ReminderLink without deleting the reminder itself."""
        from django.shortcuts import get_object_or_404
        reminder = self.get_object()
        link = get_object_or_404(ReminderLink, pk=link_pk, reminder=reminder)
        link.delete()
        return Response({"detail": "Link removed."}, status=status.HTTP_204_NO_CONTENT)


class EntityReminderViewSet(BaseViewSet):
    """
    Read-only viewset for fetching all reminders linked to a specific entity.
    
    Usage:
        GET /notification/entity-reminders/?entity_type=tasks.task&entity_id=42
    """
    serializer_class = ReminderSerializer
    queryset = Reminder.objects.none()

    def get_queryset(self):
        return Reminder.objects.none()

    def list(self, request, *args, **kwargs):
        entity_type = request.query_params.get("entity_type")  # e.g. "tasks.task"
        entity_id = request.query_params.get("entity_id")

        if not entity_type or not entity_id:
            return Response(
                {"detail": "Both 'entity_type' and 'entity_id' query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            app_label, model = entity_type.lower().split(".")
            from django.contrib.contenttypes.models import ContentType
            ct = ContentType.objects.get(app_label=app_label, model=model)
        except (ValueError, ContentType.DoesNotExist):
            return Response(
                {"detail": f"Unknown entity_type: '{entity_type}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        linked_ids = ReminderLink.objects.filter(
            content_type=ct,
            object_id=entity_id,
        ).values_list("reminder_id", flat=True)

        reminders = (
            Reminder.objects
            .filter(id__in=linked_ids, user=request.user)
            .prefetch_related("links")
            .order_by("remind_at")
        )
        serializer = self.get_serializer(reminders, many=True)
        return Response(serializer.data)

