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

