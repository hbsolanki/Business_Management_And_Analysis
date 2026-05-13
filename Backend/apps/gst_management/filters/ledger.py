import django_filters
from apps.invoice.models import Invoice
from apps.supplier.models import SalesOrder, PurchaseOrder
from apps.cost.models import Expense

from apps.gst_management.models import MonthlyGSTSummary

class MonthlyGSTSummaryFilter(django_filters.FilterSet):
    month = django_filters.NumberFilter(field_name="month", lookup_expr="exact")
    year = django_filters.NumberFilter(field_name="year", lookup_expr="exact")

    class Meta:
        model = MonthlyGSTSummary
        fields = ["month", "year"]

class LedgerBaseFilter(django_filters.FilterSet):

    start_date = django_filters.DateFilter(method='filter_start_date')
    end_date = django_filters.DateFilter(method='filter_end_date')
    branch = django_filters.NumberFilter(field_name="branch_id", lookup_expr="exact")

    def filter_start_date(self, queryset, name, value):
        date_field = getattr(self.Meta, 'date_field', 'created_at')
        return queryset.filter(**{f"{date_field}__gte": value})

    def filter_end_date(self, queryset, name, value):
        date_field = getattr(self.Meta, 'date_field', 'created_at')
        return queryset.filter(**{f"{date_field}__lte": value})

class InvoiceLedgerFilter(LedgerBaseFilter):
    product_name = django_filters.CharFilter(field_name="invoice_items__product__name", lookup_expr="icontains")
    category_name = django_filters.CharFilter(field_name="invoice_items__product__product_category__name", lookup_expr="icontains")

    class Meta:
        model = Invoice
        fields = ["start_date", "end_date", "branch", "product_name", "category_name"]
        date_field = "created_at"

class PurchaseOrderLedgerFilter(LedgerBaseFilter):
    supplier_name = django_filters.CharFilter(field_name="supplier__name", lookup_expr="icontains")
    supplier_mobile = django_filters.CharFilter(field_name="supplier__mobile_number", lookup_expr="icontains")

    class Meta:
        model = PurchaseOrder
        fields = ["start_date", "end_date", "branch", "supplier_name", "supplier_mobile"]
        date_field = "received_at"

class ExpenseLedgerFilter(LedgerBaseFilter):
    title = django_filters.CharFilter(field_name="title", lookup_expr="icontains")

    class Meta:
        model = Expense
        fields = ["start_date", "end_date", "branch", "title"]
        date_field = "date"
