import django_filters
from apps.invoice.models import Invoice
from apps.base.filters import BaseFilter

class InvoiceFilter(BaseFilter):
    mobile_number = django_filters.CharFilter(
        field_name="customer__mobile_number",
        lookup_expr="exact"
    )

    class Meta:
        model = Invoice
        fields = BaseFilter.Meta.fields + ["mobile_number"]

