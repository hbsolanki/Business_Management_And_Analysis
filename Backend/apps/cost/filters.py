import django_filters
from django.db.models import Q
from apps.cost.models import MonthlyFinancialSummary, MonthlyCostCategory, CostCategory, Expense
from apps.base.filters import BaseFilter


class MonthCostFilter(BaseFilter):
    month = django_filters.NumberFilter(field_name="month")
    year = django_filters.NumberFilter(field_name="year")

    class Meta:
        model = MonthlyFinancialSummary
        fields = BaseFilter.Meta.fields + ["month", "year"]


class MonthlyCostCategoryFilter(django_filters.FilterSet):
    month = django_filters.NumberFilter(field_name="monthly_summary__month")
    year = django_filters.NumberFilter(field_name="monthly_summary__year")
    branch = django_filters.NumberFilter(field_name="monthly_summary__branch_id")

    class Meta:
        model = MonthlyCostCategory
        fields = ["month", "year", "branch"]


class CostCategoryFilter(django_filters.FilterSet):
    class Meta:
        model = CostCategory
        fields = []


class ExpenseFilter(django_filters.FilterSet):
    min_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")
    start_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    category = django_filters.NumberFilter(field_name="category_id")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Expense
        fields = ["min_amount", "max_amount", "start_date", "end_date", "category", "search"]

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )

