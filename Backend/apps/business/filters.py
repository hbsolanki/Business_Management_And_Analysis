import django_filters
from apps.business.models import Branch, BusinessCustomer, Business


class BusinessFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Business
        fields = ["name"]


class BranchFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Branch
        fields = ['name', 'is_default']


class BusinessCustomerFilter(django_filters.FilterSet):
    mobile_number = django_filters.CharFilter(
        field_name="mobile_number",
        lookup_expr="exact"
    )

    class Meta:
        model = BusinessCustomer
        fields = ["mobile_number"]
