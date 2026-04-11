from apps.base.filters import BaseFilter
from apps.invoice.models import Invoice, ProductInvoice
import django_filters
import calendar
from datetime import datetime
from django.utils import timezone


class CustomerCreatedAtRangeFilter(BaseFilter):
    class Meta:
        model = Invoice
        fields = BaseFilter.Meta.fields


class CustomerInvoiceFilter(BaseFilter):
    customer_id = django_filters.NumberFilter(field_name="customer__id")
    mobile_number = django_filters.CharFilter(
        field_name="customer__mobile_number",
        lookup_expr="exact"
    )

    class Meta:
        model = Invoice
        fields = BaseFilter.Meta.fields + ["customer_id", "mobile_number"]


class CustomerInvoiceProductFilter(BaseFilter):
    customer_id = django_filters.NumberFilter(field_name="invoice__customer__id")
    product_id = django_filters.NumberFilter(field_name="product_id")
    mobile_number = django_filters.CharFilter(
        field_name="invoice__customer__mobile_number",
        lookup_expr="exact"
    )

    # Overriding dates to point to nested invoice__created_at
    from_date = django_filters.DateFilter(
        field_name="invoice__created_at",
        lookup_expr="date__gte"
    )

    to_date = django_filters.DateFilter(
        field_name="invoice__created_at",
        lookup_expr="date__lte"
    )
    branch = django_filters.NumberFilter(
        field_name="invoice__branch_id",
        lookup_expr="exact"
    )

    class Meta:
        model = ProductInvoice
        fields = BaseFilter.Meta.fields + ["customer_id", "product_id", "mobile_number"]


class CustomerMonthYearFilter(BaseFilter):
    month = django_filters.NumberFilter(method="filter_month")
    year = django_filters.NumberFilter(method="filter_month")

    def filter_month(self, queryset, name, value):
        month = self.data.get("month")
        year = self.data.get("year")

        if not month or not year:
            return queryset

        month = int(month)
        year = int(year)

        start = timezone.make_aware(datetime(year, month, 1, 0, 0, 0))
        last_day = calendar.monthrange(year, month)[1]
        end = timezone.make_aware(datetime(year, month, last_day, 23, 59, 59))

        return queryset.filter(created_at__range=(start, end))

    class Meta:
        model = Invoice
        fields = BaseFilter.Meta.fields + ["month", "year"]
