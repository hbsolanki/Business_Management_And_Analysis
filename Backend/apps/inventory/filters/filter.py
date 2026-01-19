import django_filters
from apps.inventory.models import InventoryTransaction, InventoryProduct


class InventoryTransactionFilter(django_filters.FilterSet):
    action=django_filters.CharFilter(field_name="action",lookup_expr="exact")
    from_date = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__gte"
    )

    to_date = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__lte"
    )
    product_name=django_filters.CharFilter(field_name="items__product__name",lookup_expr="icontains")
    product_sku=django_filters.CharFilter(field_name="items__product__sku",lookup_expr="icontains")

    class Meta:
        model = InventoryTransaction
        fields = ["action", "from_date", "to_date", "product_name", "product_sku"]


class InventoryProductFilter(django_filters.FilterSet):
    name=django_filters.CharFilter(field_name="product__name",lookup_expr="icontains")
    sku=django_filters.CharFilter(field_name="product__sku",lookup_expr="icontains")

    class Meta:
        model = InventoryProduct
        fields = ["name", "sku"]