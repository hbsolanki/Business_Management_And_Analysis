from apps.base.filters import BaseFilter
import django_filters
from django.db import models
from django.utils import timezone
from apps.tasks.models import Task


class TaskFilter(BaseFilter):
    title=django_filters.CharFilter(field_name='title',lookup_expr='icontains')
    remarks=django_filters.CharFilter(field_name='remarks',lookup_expr='icontains')
    assignee = django_filters.NumberFilter(field_name='assignee__id')
    assigned_by = django_filters.NumberFilter(field_name='assigned_by__id')

    # Deadline filters
    from_deadline = django_filters.DateTimeFilter(field_name='deadline', lookup_expr='gte')
    to_deadline = django_filters.DateTimeFilter(field_name='deadline', lookup_expr='lte')
    overdue = django_filters.BooleanFilter(method='filter_overdue')

    class Meta:
        model = Task
        fields = BaseFilter.Meta.fields + [
            'title', 'remarks', 'assignee', 'assigned_by',
            'from_deadline', 'to_deadline', 'overdue'
        ]

    def filter_overdue(self, queryset, name, value):
        if value:
            return queryset.filter(deadline__lt=timezone.now()).exclude(status=Task.Status.COMPLETED)
        else:
            return queryset.filter(
                models.Q(deadline__gte=timezone.now()) |
                models.Q(deadline__isnull=True) |
                models.Q(status=Task.Status.COMPLETED)
            )
