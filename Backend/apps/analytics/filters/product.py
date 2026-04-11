import django_filters
from apps.cost.models import MonthlyProductPerformance
from apps.invoice.models import ProductInvoice
from apps.inventory.models import InventoryProduct


class ProductPerformanceMonthYearFilter(django_filters.FilterSet):
    product_id = django_filters.NumberFilter(field_name="product_id", lookup_expr="exact")
    from_date = django_filters.DateFilter(
        field_name="monthly_summary__created_at",
        lookup_expr="date__gte"
    )
    to_date = django_filters.DateFilter(
        field_name="monthly_summary__created_at",
        lookup_expr="date__lte"
    )
    branch = django_filters.NumberFilter(
        field_name="monthly_summary__branch_id",
        lookup_expr="exact"
    )

    class Meta:
        model = MonthlyProductPerformance
        fields = ["product_id", "from_date", "to_date", "branch"]


class ProductPerformanceFilter(django_filters.FilterSet):
    product_id = django_filters.NumberFilter(field_name="product__id", lookup_expr="exact")
    category_id = django_filters.NumberFilter(field_name="product__product_category__id", lookup_expr="exact")
    from_date_and_time = django_filters.IsoDateTimeFilter(
        field_name="invoice__created_at",
        lookup_expr="gte"
    )
    to_date_and_time = django_filters.IsoDateTimeFilter(
        field_name="invoice__created_at",
        lookup_expr="lte"
    )
    branch = django_filters.NumberFilter(
        field_name="invoice__branch_id",
        lookup_expr="exact"
    )

    class Meta:
        model = ProductInvoice
        fields = ["product_id", "category_id", "from_date_and_time", "to_date_and_time", "branch"]


class ProductStockFilter(django_filters.FilterSet):
    product_id = django_filters.NumberFilter(field_name="product__id", lookup_expr="exact")
    category_id = django_filters.NumberFilter(field_name="product__product_category__id", lookup_expr="exact")
    branch = django_filters.NumberFilter(field_name="inventory__branch_id", lookup_expr="exact")

    class Meta:
        model = InventoryProduct
        fields = ["product_id", "category_id", "branch"]
