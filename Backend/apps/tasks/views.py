from rest_framework import viewsets, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q
from django.core.cache import cache

from apps.base.views.base_view import BaseViewSet
from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.tasks.filters import TaskFilter
from apps.notification.mixins import CreateReminderMixin
from apps.tasks.utils.send_notification import (
    send_task_assigned_notification,
    send_task_completed_notification,
)
from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog
from apps.master.utils.cache import make_cache_key, invalidate_cache


class TaskViewSet(CreateReminderMixin, ActivityLogMixin, BaseViewSet, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    activity_module = ActivityLog.Module.TASKS
    serializer_class = TaskSerializer
    filterset_class = TaskFilter

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset() # This gets branch filtering from BaseViewSet
        return queryset.filter(Q(assignee=user) | Q(assigned_by=user))

    def list(self, request, *args, **kwargs):
        cache_key = make_cache_key(request, "tasks", "list", request.user)
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 60 * 15)
        return Response(response.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_cache("tasks", "list", self.request.user)
        send_task_assigned_notification(serializer.instance, self.request)

    def perform_destroy(self, instance):
        if self.request.user.id != instance.assigned_by_id:
            raise PermissionDenied("You do not have permission to delete this task.")

        invalidate_cache("tasks", "list", self.request.user)
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        super().perform_update(serializer)
        task = serializer.instance
        invalidate_cache("tasks", "list", self.request.user)

        if old_status != Task.Status.COMPLETED and task.status == Task.Status.COMPLETED:
            send_task_completed_notification(task, self.request)

