import django_filters
from apps.supplier.models import Supplier, PurchaseOrder, SalesOrder


class SupplierFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    mobile_number = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Supplier
        fields = ['name', 'mobile_number']


class BaseOrderFilter(django_filters.FilterSet):
    order_date_after = django_filters.DateFilter(field_name='order_date', lookup_expr='gte')
    order_date_before = django_filters.DateFilter(field_name='order_date', lookup_expr='lte')
    branch = django_filters.NumberFilter(field_name='branch_id')
    status = django_filters.CharFilter(field_name='status')

    class Meta:
        abstract = True


class PurchaseOrderFilter(BaseOrderFilter):
    supplier_name = django_filters.CharFilter(field_name='supplier__name', lookup_expr='icontains')

    class Meta:
        model = PurchaseOrder
        fields = ['order_date_after', 'order_date_before', 'branch', 'status', 'supplier_name']


class SalesOrderFilter(BaseOrderFilter):
    customer_name = django_filters.CharFilter(field_name='customer__name', lookup_expr='icontains')

    class Meta:
        model = SalesOrder
        fields = ['order_date_after', 'order_date_before', 'branch', 'status', 'customer_name']
