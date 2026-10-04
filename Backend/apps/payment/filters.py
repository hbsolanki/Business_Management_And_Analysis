import django_filters
from apps.payment.models import Payment, InvoicePayment

class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass

class PaymentFilter(django_filters.FilterSet):
    status = CharInFilter(field_name="status", lookup_expr="in")
    method = CharInFilter(field_name="method", lookup_expr="in")
    
    from_date = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte"
    )
    to_date = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte"
    )

    class Meta:
        model = Payment
        fields = ["status", "method", "from_date", "to_date"]


class InvoicePaymentFilter(django_filters.FilterSet):
    status = CharInFilter(field_name="payment__status", lookup_expr="in")
    method = CharInFilter(field_name="payment__method", lookup_expr="in")
    
    from_date = django_filters.DateTimeFilter(
        field_name="payment__created_at",
        lookup_expr="gte"
    )
    to_date = django_filters.DateTimeFilter(
        field_name="payment__created_at",
        lookup_expr="lte"
    )

    class Meta:
        model = InvoicePayment
        fields = ["status", "method", "from_date", "to_date"]


