from django.db.models import (
    Sum, F, Count, Avg, Max, Min, Q,
    DecimalField, ExpressionWrapper, Subquery, OuterRef, Value
)
from django.db.models.functions import Round, Coalesce
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from apps.invoice.models import Invoice, ProductInvoice
from apps.analytics.filters.customer import (
    CustomerCreatedAtRangeFilter, CustomerInvoiceFilter,
    CustomerInvoiceProductFilter, CustomerMonthYearFilter
)
from apps.analytics.serializers.customer import (
    CustomerRevenueLeaderboardSerializer,
    CustomerRetentionAnalyticsSerializer,
    CustomerProductPreferenceSerializer,
    CustomerProductNestedSerializer,
    CustomerSpendSerializer
)
from apps.analytics.serializers.filter.customer import (
    CustomerInvoiceFilterSerializer,
    CustomerInvoiceProductFilterSerializer,
    CustomerMonthYearFilterSerializer,
    CustomerCreatedAtRangeFilterSerializer
)
from drf_spectacular.utils import extend_schema
from apps.analytics.pagination import DefaultPagination
from django.core.cache import cache
from apps.master.utils.cache import make_cache_key
from apps.analytics.permission import CanViewCustomerAnalytics
from apps.subscription.permissions import AdvancedAnalyticsFeaturePermission
from apps.base.views.base_view import BaseViewSet


class CustomerViewSet(BaseViewSet):
    permission_classes = [CanViewCustomerAnalytics, AdvancedAnalyticsFeaturePermission]
    def get_queryset(self):
        return Invoice.objects.filter(
            business=self.request.user.business,
            customer__isnull=False
        )
    pagination_class = DefaultPagination

    def get_filter_set(self):
        if self.action == "customer_leaderboard_revenue":
            return CustomerInvoiceFilter
        elif self.action == "customer_metrics_retention":
            return CustomerCreatedAtRangeFilter
        elif self.action == "customer_product_preference":
            return CustomerInvoiceFilter
        elif self.action == "customer_product":
            return CustomerInvoiceProductFilter
        elif self.action == "customer_spend":
            return CustomerMonthYearFilter
        return None

    def apply_filters(self, request, queryset):
        filterset_class = self.get_filter_set()
        if not filterset_class:
            return queryset, None

        filterset = filterset_class(request.GET, queryset=queryset)
        if not filterset.is_valid():
            return None, Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        return filterset.qs, None

    @extend_schema(
        summary="Customer Leaderboard Revenue",
        parameters=[CustomerInvoiceFilterSerializer],
        responses={200: CustomerRevenueLeaderboardSerializer(many=True)}
    )
    @action(methods=["get"], detail=False, url_path="leaderboard/revenue")
    def customer_leaderboard_revenue(self, request):
        cache_key = make_cache_key(request, "analytics", "customer_leaderboard_revenue", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        invoice_qs, error = self.apply_filters(request, self.get_queryset())
        if error:
            return error

        data = (
            invoice_qs
            .values(
                "customer_id",
                customer_name=F("customer__name"),
                customer_mobile_number=F("customer__mobile_number"),
            )
            .annotate(
                total_revenue=Coalesce(Sum("total_amount"), Value(0, output_field=DecimalField())),
                order_count=Count("id"),
                avg_order_value=Coalesce(Round(Avg("total_amount"), 2), Value(0, output_field=DecimalField())),
                first_order_at=Min("created_at"),
                last_order_at=Max("created_at"),
            )
            .order_by("-total_revenue", "customer_id")
        )

        page_data = self.paginate_queryset(data)
        if page_data is not None:
            serializer = CustomerRevenueLeaderboardSerializer(page_data, many=True)
            response = self.get_paginated_response(serializer.data)
            cache.set(cache_key, response.data, timeout=60 * 5)
            return response

        serializer = CustomerRevenueLeaderboardSerializer(data, many=True)
        cache.set(cache_key, serializer.data, timeout=60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Customer Metrics Retention",
        parameters=[CustomerCreatedAtRangeFilterSerializer],
        responses={200: CustomerRetentionAnalyticsSerializer}
    )
    @action(methods=["get"], detail=False, url_path="metrics/retention")
    def customer_metrics_retention(self, request):
        cache_key = make_cache_key(request, "analytics", "customer_metrics_retention", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        invoice_qs, error = self.apply_filters(request, self.get_queryset())
        if error:
            return error

        customer_stats = (
            invoice_qs
            .values("customer_id")
            .annotate(order_count=Count("id"))
        )

        data = customer_stats.aggregate(
            total_customers=Count("customer_id", distinct=True),
            new_customers=Count("customer_id", filter=Q(order_count=1), distinct=True),
            returning_customers=Count("customer_id", filter=Q(order_count__gt=1), distinct=True),
        )

        total_customers = data["total_customers"]
        if total_customers > 0:
            data["retention_rate"] = round(data["returning_customers"] / total_customers * 100, 2)
            data["churn_rate"] = round(100 - data["retention_rate"], 2)
        else:
            data["retention_rate"] = 0
            data["churn_rate"] = 0

        serializer = CustomerRetentionAnalyticsSerializer(data)
        cache.set(cache_key, serializer.data, timeout=60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Customer Product Preferences",
        parameters=[CustomerInvoiceFilterSerializer],
        responses={200: CustomerProductPreferenceSerializer(many=True)}
    )
    @action(methods=["get"], detail=False, url_path="product/preferences")
    def customer_product_preference(self, request):
        cache_key = make_cache_key(request, "analytics", "customer_product_preference", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        invoice_qs, error = self.apply_filters(request, self.get_queryset())
        if error:
            return error

        products_invoice_qs = ProductInvoice.objects.filter(invoice__in=invoice_qs)

        customer_product_totals = (
            products_invoice_qs
            .values("invoice__customer__mobile_number", "product")
            .annotate(
                total_qty=Sum("quantity"),
                revenue=Sum(F("quantity") * F("selling_price"))
            )
        )

        max_qty_subquery = (
            ProductInvoice.objects
            .filter(
                invoice__customer=OuterRef("invoice__customer"),
                invoice__in=invoice_qs
            )
            .values("invoice__customer", "product")
            .annotate(total_qty=Sum("quantity"))
            .order_by("-total_qty")
            .values("total_qty")[:1]
        )

        product_preferences_data = (
            customer_product_totals
            .annotate(max_qty=Subquery(max_qty_subquery))
            .filter(total_qty=F("max_qty"))
            .values(
                customer_id=F("invoice__customer"),
                customer_name=F("invoice__customer__name"),
                product_id=F("product"),
                product_category=F("product__product_category__name"),
                product_name=F("product__name"),
                quantity=F("total_qty"),
                total_revenue=ExpressionWrapper(
                    F("revenue"),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
            )
            .order_by("-total_revenue", "customer_id")
        )

        page = self.paginate_queryset(product_preferences_data)
        if page is not None:
            serializer = CustomerProductPreferenceSerializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            cache.set(cache_key, response.data, timeout=60 * 5)
            return response

        serializer = CustomerProductPreferenceSerializer(product_preferences_data, many=True)
        cache.set(cache_key, serializer.data, timeout=60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Customer Products",
        parameters=[CustomerInvoiceProductFilterSerializer],
        responses={200: CustomerProductNestedSerializer(many=True)}
    )
    @action(methods=["get"], detail=False, url_path="product")
    def customer_product(self, request):
        cache_key = make_cache_key(request, "analytics", "customer_product", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        products_invoice_qs, error = self.apply_filters(
            request, ProductInvoice.objects.filter(invoice__in=self.get_queryset())
        )
        if error:
            return error

        customer_product_totals = (
            products_invoice_qs
            .values(
                customer_id=F("invoice__customer"),
                customer_name=F("invoice__customer__name"),
                mobile_number=F("invoice__customer__mobile_number"),
                p_id=F("product"),
                product_name=F("product__name"),
            )
            .annotate(
                total_revenue=Sum(
                    F("quantity") * F("selling_price"),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
            .annotate(quantity=Sum("quantity"))
            .order_by("invoice__customer__name")
        )

        grouped = {}
        for row in customer_product_totals:
            cid = row["customer_id"]
            if cid not in grouped:
                grouped[cid] = {
                    "customer_id": cid,
                    "customer_name": row["customer_name"],
                    "mobile_number": row["mobile_number"],
                    "products": []
                }
            grouped[cid]["products"].append({
                "p_id": row["p_id"],
                "product_name": row["product_name"],
                "quantity": row["quantity"],
                "total_revenue": row["total_revenue"],
            })

        final_data = list(grouped.values())

        page = self.paginate_queryset(final_data)
        if page is not None:
            serializer = CustomerProductNestedSerializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            cache.set(cache_key, response.data, timeout=60 * 5)
            return response

        serializer = CustomerProductNestedSerializer(final_data, many=True)
        cache.set(cache_key, serializer.data, timeout=60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Customer Spend Trend",
        parameters=[CustomerMonthYearFilterSerializer],
        responses={200: CustomerSpendSerializer(many=True)}
    )
    @action(methods=["get"], detail=False, url_path="spend")
    def customer_spend(self, request):
        cache_key = make_cache_key(request, "analytics", "customer_spend", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        invoice_qs, error = self.apply_filters(request, self.get_queryset())
        if error:
            return error

        data = (
            invoice_qs
            .values(
                c_id=F("customer"),
                customer_name=F("customer__name"),
                mobile_number=F("customer__mobile_number"),
            )
            .annotate(
                total_revenue=Coalesce(Sum("total_amount"), Value(0, output_field=DecimalField()))
            )
            .order_by("-total_revenue")
        )

        serializer = CustomerSpendSerializer(data, many=True)
        cache.set(cache_key, serializer.data, timeout=60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)
