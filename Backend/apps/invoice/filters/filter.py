import django_filters
from apps.invoice.models import Invoice


class InvoiceFilter(django_filters.FilterSet):
    mobile_number = django_filters.CharFilter(
        field_name="customer__mobile_number",
        lookup_expr="exact"
    )

    from_date = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__gte"
    )

    to_date = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__lte"
    )

    class Meta:
        model = Invoice
        fields = ["mobile_number", "from_date", "to_date"]
