import django_filters
from django.db.models import Q
from apps.user.models import User


class UserFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    role = django_filters.CharFilter(field_name="business_roles__role", lookup_expr="iexact")
    branch = django_filters.NumberFilter(field_name="assigned_branches__branch__id")
    salary_min = django_filters.NumberFilter(field_name="employee_details__salary", lookup_expr="gte")
    salary_max = django_filters.NumberFilter(field_name="employee_details__salary", lookup_expr="lte")
    work_assignment = django_filters.CharFilter(field_name="branch_works__work_type", lookup_expr="iexact")

    class Meta:
        model = User
        fields = ['role', 'branch', 'salary_min', 'salary_max', 'work_assignment']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(username__icontains=value) |
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value) |
            Q(business_roles__role__icontains=value)
        )
