import django_filters
from apps.activity_log.models import ActivityLog

class ActivityLogFilter(django_filters.FilterSet):
    actor = django_filters.NumberFilter(field_name='actor__id')
    module = django_filters.ChoiceFilter(choices=ActivityLog.Module.choices)
    action = django_filters.ChoiceFilter(choices=ActivityLog.Action.choices)
    branch = django_filters.NumberFilter(field_name='branch_id')

    class Meta:
        model = ActivityLog
        fields = ['actor', 'module', 'action', 'branch']
