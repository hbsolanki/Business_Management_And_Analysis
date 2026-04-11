from rest_framework.mixins import ListModelMixin
from apps.activity_log.models import ActivityLog
from apps.activity_log.serializers import ActivityLogSerializer
from apps.activity_log.filters import ActivityLogFilter
from apps.master.permission.custom_permissions import IsOwnerOrManager
from apps.base.views.base_view import BaseViewSet

class ActivityLogViewSet(BaseViewSet, ListModelMixin):
    """
    Viewset for Activity Logs.
    Business filtering is handled by BaseViewSet.get_queryset().
    """
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    filterset_class = ActivityLogFilter
    permission_classes = [IsOwnerOrManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset.select_related('actor').order_by('-created_at')
        return queryset.select_related('actor').order_by('-created_at')