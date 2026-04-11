from apps.base.filters import BaseFilter
import django_filters
from apps.tasks.models import Task


class TaskFilter(BaseFilter):
    title=django_filters.CharFilter(field_name='title',lookup_expr='icontains')
    remarks=django_filters.CharFilter(field_name='remarks',lookup_expr='icontains')
    assignee = django_filters.NumberFilter(field_name='assignee__id')
    assigned_by = django_filters.NumberFilter(field_name='assigned_by__id')
    class Meta:
        model = Task
        fields = BaseFilter.Meta.fields + ['title','remarks', 'assignee', 'assigned_by']
