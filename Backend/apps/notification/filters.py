import django_filters
from django.db.models import Q
from apps.notification.models import Reminder

class ReminderFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    recurrence = django_filters.CharFilter(field_name="recurrence")
    date = django_filters.DateFilter(field_name="remind_at", lookup_expr="date")
    status = django_filters.CharFilter(method="filter_status")
    is_sent = django_filters.BooleanFilter(field_name="is_sent")
    from_date = django_filters.DateTimeFilter(field_name="remind_at", lookup_expr="gte")
    to_date = django_filters.DateTimeFilter(field_name="remind_at", lookup_expr="lte")

    class Meta:
        model = Reminder
        fields = ["search", "recurrence", "date", "status", "is_sent", "from_date", "to_date"]

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value) | Q(content__icontains=value)
        )

    def filter_status(self, queryset, name, value):
        if not value or value == 'ALL':
            return queryset
        if value == 'PENDING':
            return queryset.filter(is_sent=False)
        if value == 'SENT':
            return queryset.filter(is_sent=True)
        return queryset
