import django_filters
from apps.inventory.models import InventoryTransaction, InventoryProduct
from apps.base.filters import BaseFilter

class InventoryTransactionFilter(BaseFilter):
    action = django_filters.CharFilter(field_name="action", lookup_expr="exact")
    product_name = django_filters.CharFilter(field_name="items__product__name", lookup_expr="icontains")
    product_sku = django_filters.CharFilter(field_name="items__product__sku", lookup_expr="icontains")
    branch = django_filters.NumberFilter(field_name="inventory__branch_id", lookup_expr="exact")

    class Meta:
        model = InventoryTransaction
        fields = BaseFilter.Meta.fields + ["action", "product_name", "product_sku"]


class InventoryProductFilter(django_filters.FilterSet):
    name=django_filters.CharFilter(field_name="product__name",lookup_expr="icontains")
    sku=django_filters.CharFilter(field_name="product__sku",lookup_expr="icontains")
    branch = django_filters.NumberFilter(field_name="inventory__branch_id",lookup_expr="exact")

    class Meta:
        model = InventoryProduct
        fields = ["name", "sku", "branch"]