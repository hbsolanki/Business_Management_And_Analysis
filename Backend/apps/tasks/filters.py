from apps.base.filters import BaseFilter
import django_filters
from apps.tasks.models import Task, TaskGroup
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

class TaskGroupFilter(BaseFilter):
    name = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    is_private = django_filters.BooleanFilter(field_name='is_private')
    member_id = django_filters.NumberFilter(field_name='members__user__id', distinct=True)

    class Meta:
        model = TaskGroup
        fields = BaseFilter.Meta.fields + ['name', 'is_private', 'member_id']


class TaskFilter(BaseFilter):
    title=django_filters.CharFilter(field_name='title',lookup_expr='icontains')
    assignee = django_filters.NumberFilter(method='filter_assignee')
    taskgroup = django_filters.NumberFilter(method='filter_taskgroup')
    assigned_by = django_filters.NumberFilter(field_name='assigned_by__id')

    # Deadline filters
    from_deadline = django_filters.DateTimeFilter(field_name='deadline', lookup_expr='gte')
    to_deadline = django_filters.DateTimeFilter(field_name='deadline', lookup_expr='lte')

    class Meta:
        model = Task
        fields = BaseFilter.Meta.fields + [
            'title', 'assignee', 'taskgroup', 'assigned_by',
            'from_deadline', 'to_deadline'
        ]

    def filter_assignee(self, queryset, name, value):
        user_ct = ContentType.objects.get_for_model(get_user_model())
        return queryset.filter(assignments__assignee_type=user_ct, assignments__assignee_id=value)

    def filter_taskgroup(self, queryset, name, value):
        group_ct = ContentType.objects.get_for_model(TaskGroup)
        return queryset.filter(assignments__assignee_type=group_ct, assignments__assignee_id=value)
