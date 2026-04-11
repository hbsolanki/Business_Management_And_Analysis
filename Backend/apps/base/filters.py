import django_filters
from django.db import models

class BaseFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__gte"
    )

    to_date = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__lte"
    )

    branch = django_filters.NumberFilter(
        field_name="branch_id",
        lookup_expr="exact"
    )

    class Meta:
        fields = ['from_date', 'to_date', 'branch']
