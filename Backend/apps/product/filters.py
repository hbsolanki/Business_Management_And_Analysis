import django_filters
from apps.product.models import Product

class ProductFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name",lookup_expr="icontains")
    sku = django_filters.CharFilter(field_name="sku",lookup_expr="icontains")
    product_category = django_filters.NumberFilter(
        field_name="product_category_id",
        lookup_expr="exact"
    )
    class Meta:
        model = Product
        fields = ["sku","name","product_category"]