import django_filters
from apps.cost.models import MonthlyFinancialSummary
from datetime import datetime
from django.db.models import Q

class MonthlySummaryMonthYearFilter(django_filters.FilterSet):
    month = django_filters.NumberFilter(field_name="month", lookup_expr="exact")
    year = django_filters.NumberFilter(field_name="year", lookup_expr="exact")
    branch=django_filters.NumberFilter(field_name="branch_id", lookup_expr="exact")

    class Meta:
        model = MonthlyFinancialSummary
        fields = ["month", "year"]


class MonthlySummaryDateRangeFilter(django_filters.FilterSet):
    start_month = django_filters.NumberFilter(method='filter_date_range')
    start_year = django_filters.NumberFilter(method='filter_date_range')
    end_month = django_filters.NumberFilter(method='filter_date_range')
    end_year = django_filters.NumberFilter(method='filter_date_range')
    branch = django_filters.NumberFilter(field_name="branch_id", lookup_expr="exact")

    # Keep the simple year filter for backward compatibility or simple year filtering
    year = django_filters.NumberFilter(field_name="year", lookup_expr="exact")

    def filter_date_range(self, queryset, name, value):
        # We process the filter only once when any of the parameters are present
        if name != 'start_month': 
             return queryset
        
        start_month = self.data.get('start_month')
        start_year = self.data.get('start_year')
        end_month = self.data.get('end_month')
        end_year = self.data.get('end_year')

        if not (start_month and start_year and end_month and end_year):
             return queryset

        try:
            start_month = int(start_month)
            start_year = int(start_year)
            end_month = int(end_month)
            end_year = int(end_year)
            
            queryset = queryset.filter(
                Q(year__gt=start_year) | Q(year=start_year, month__gte=start_month)
            ).filter(
                Q(year__lt=end_year) | Q(year=end_year, month__lte=end_month)
            )

        except ValueError:
            pass
            
        return queryset

    class Meta:
        model = MonthlyFinancialSummary
        fields = ["start_month", "start_year", "end_month", "end_year", "year"]

class MonthlySummaryYearFilter(django_filters.FilterSet):
    year = django_filters.NumberFilter(field_name="year", lookup_expr="exact")
    branch = django_filters.NumberFilter(field_name="branch_id", lookup_expr="exact")

    class Meta:
        model = MonthlyFinancialSummary
        fields = ["year"]
