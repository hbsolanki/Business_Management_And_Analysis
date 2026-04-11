import django_filters
from apps.cost.models import MonthlyFinancialSummary, MonthlyCostCategory, CostCategory
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
