from rest_framework import viewsets, status
from django.contrib.contenttypes.models import ContentType
from apps.user.models import User
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q

from apps.base.views.base_view import BaseViewSet
from apps.tasks.models import Task, TaskGroup
from apps.tasks.serializers import TaskSerializer, TaskGroupSerializer
from apps.tasks.filters import TaskFilter, TaskGroupFilter
from apps.employee.models import UserRole
from apps.notification.mixins import CreateReminderMixin
from apps.tasks.utils.send_task_notification import (
    send_task_assigned_notification,
    send_task_completed_notification,
)
from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog


class TaskGroupViewSet(BaseViewSet, viewsets.ModelViewSet):
    queryset = TaskGroup.objects.all()
    serializer_class = TaskGroupSerializer
    filterset_class = TaskGroupFilter

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        return queryset.filter(
            Q(is_private=False) | 
            Q(created_by=user) | 
            Q(members__user=user)
        ).distinct()

    def perform_destroy(self, instance):
        user = self.request.user
        is_owner_role = getattr(user, 'role_name', None) == UserRole.OWNER
        if not is_owner_role and instance.created_by != user:
            raise PermissionDenied("Only the group creator or an Owner can delete this group.")
        super().perform_destroy(instance)


class TaskViewSet(CreateReminderMixin, ActivityLogMixin, BaseViewSet, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    activity_module = ActivityLog.Module.TASKS
    serializer_class = TaskSerializer
    filterset_class = TaskFilter

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()  # Includes branch filtering from BaseViewSet
        
        # 1. Tasks created by the user
        is_creator = Q(assigned_by=user)
        
        # 2. Tasks assigned directly to the user
        user_ct = ContentType.objects.get_for_model(User)
        is_direct_assignee = Q(assignments__assignee_type=user_ct, assignments__assignee_id=user.id)
        
        # 3. Tasks assigned to any of the user's groups
        group_ct = ContentType.objects.get_for_model(TaskGroup)
        user_group_ids = user.task_group_memberships.values_list('group_id', flat=True)
        is_group_assignee = Q(assignments__assignee_type=group_ct, assignments__assignee_id__in=user_group_ids)

        # Combine conditions and return distinct tasks
        return queryset.filter(is_creator | is_direct_assignee | is_group_assignee).distinct()


    def perform_create(self, serializer):
        super().perform_create(serializer)
        task = serializer.instance
        send_task_assigned_notification(task, self.request)

    def perform_destroy(self, instance):
        if self.request.user.id != instance.assigned_by_id:
            raise PermissionDenied("You do not have permission to delete this task.")

        super().perform_destroy(instance)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        old_assignments = list(serializer.instance.assignments.all())
        
        super().perform_update(serializer)
        task = serializer.instance

        # Handle notifications if assignment changed
        new_assignments_str = set(f"{a.assignee_type.model}_{a.assignee_id}" for a in task.assignments.all())
        old_assignments_str = set(f"{a.assignee_type.model}_{a.assignee_id}" for a in old_assignments)
        if new_assignments_str != old_assignments_str:
            send_task_assigned_notification(task, self.request)

        if old_status != Task.Status.COMPLETED and task.status == Task.Status.COMPLETED:
            send_task_completed_notification(task, self.request)

