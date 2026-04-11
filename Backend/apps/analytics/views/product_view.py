from django.db.models import Sum, F, Count, Value, DecimalField
from django.db.models.functions import Coalesce
from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema

from apps.base.views.base_view import BaseViewSet
from apps.master.utils.cache import make_cache_key
from apps.subscription.permissions import AdvancedAnalyticsFeaturePermission

from apps.business.models import Branch
from apps.employee.models import UserRole
from apps.product.models import Product
from apps.inventory.models import Inventory, InventoryProduct
from apps.invoice.models import ProductInvoice
from apps.cost.models import MonthlyProductPerformance

from apps.analytics.permission import CanViewProductAnalytics
from apps.analytics.serializers.product import (
    ProductDetailsSerializer, ProductStockSerializer, 
    ProductPerformanceReportSerializer, CategoryPerformanceSerializer,
    ProductStockFilterSerializer, ProductPerformanceFilterSerializer
)
from apps.analytics.filters.product import ProductPerformanceFilter, ProductStockFilter

class AnalysisProductViewSet(BaseViewSet):
    permission_classes = [CanViewProductAnalytics, AdvancedAnalyticsFeaturePermission]

    def get_queryset(self):
        user = self.request.user
        branch_id = self.request.query_params.get('branch')

        if self.action == 'product_details':
            return Product.objects.filter(business=user.business)

        if self.action == 'product_stocks':
            queryset = InventoryProduct.objects.filter(inventory__business=user.business)
            if user.role_name == UserRole.OWNER:
                if branch_id:
                    queryset = queryset.filter(inventory__branch_id=branch_id)
            else:
                assigned_branches = user.branches
                if branch_id:
                    queryset = queryset.filter(inventory__branch_id=branch_id, inventory__branch__in=assigned_branches)
                else:
                    queryset = queryset.filter(inventory__branch__in=assigned_branches)
            return queryset.select_related("product", "product__product_category")

        if self.action in ['product_performance_report', 'category_performance']:
            queryset = ProductInvoice.objects.filter(invoice__business=user.business)
            if user.role_name == UserRole.OWNER:
                if branch_id:
                    queryset = queryset.filter(invoice__branch_id=branch_id)
            else:
                assigned_branches = user.branches
                if branch_id:
                    queryset = queryset.filter(invoice__branch_id=branch_id, invoice__branch__in=assigned_branches)
                else:
                    queryset = queryset.filter(invoice__branch__in=assigned_branches)
            return queryset

        queryset = MonthlyProductPerformance.objects.filter(monthly_summary__business=user.business)
        if user.role_name == UserRole.OWNER:
            if branch_id:
                queryset = queryset.filter(monthly_summary__branch_id=branch_id)
        else:
            assigned_branches = user.branches
            if branch_id:
                queryset = queryset.filter(monthly_summary__branch_id=branch_id, monthly_summary__branch__in=assigned_branches)
            else:
                queryset = queryset.filter(monthly_summary__branch__in=assigned_branches)
        return queryset

    def get_serializer_class(self):
        if self.action == 'product_details':
            return ProductDetailsSerializer
        elif self.action == 'product_stocks':
            return ProductStockSerializer
        elif self.action == 'product_performance_report':
            return ProductPerformanceReportSerializer
        elif self.action == 'category_performance':
            return CategoryPerformanceSerializer
        return None

    def get_filterset_class(self):
        if self.action in ["product_performance_report", "category_performance"]:
            return ProductPerformanceFilter
        elif self.action == "product_stocks":
            return ProductStockFilter
        elif self.action == "product_details":
            from apps.product.filters import ProductFilter
            return ProductFilter
        return None

    def filter_queryset(self, queryset):
        filterset_class = self.get_filterset_class()
        if not filterset_class:
            return queryset
        return filterset_class(self.request.GET, queryset=queryset).qs

    @extend_schema(
        summary="Get Product Details",
        responses={200: ProductDetailsSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="details")
    def product_details(self, request):
        cache_key = make_cache_key(request, "analytics", "product_details", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        products = self.filter_queryset(self.get_queryset()).order_by("-net_profit")
        serializer = self.get_serializer(products, many=True)
        cache.set(cache_key, serializer.data, 60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get Product Stock",
        parameters=[ProductStockFilterSerializer],
        responses={200: ProductStockSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="stock")
    def product_stocks(self, request):
        cache_key = make_cache_key(request, "analytics", "product_stocks", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        inventory_data = self.filter_queryset(self.get_queryset()).order_by("stock_quantity")
        serializer = self.get_serializer(inventory_data, many=True)
        cache.set(cache_key, serializer.data, 60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get Product Performance Report",
        parameters=[ProductPerformanceFilterSerializer],
        responses={200: ProductPerformanceReportSerializer}
    )
    @action(detail=False, methods=["get"], url_path="performance/report")
    def product_performance_report(self, request):
        user = request.user
        branch_id = request.query_params.get('branch')
        
        cache_key = make_cache_key(request, "analytics", "product_performance_report", user)
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)
        
        # 1. Base business-wide filtered queryset
        base_qs = ProductInvoice.objects.filter(invoice__business=user.business)
        
        # We manually apply the filters to have more control
        # Clean current filters to get "Global" data within timeframe
        general_params = request.GET.copy()
        general_params.pop('branch', None)
        
        general_filterset = ProductPerformanceFilter(general_params, queryset=base_qs)
        if not general_filterset.is_valid():
            return Response(general_filterset.errors, status=status.HTTP_400_BAD_REQUEST)
        
        global_qs = general_filterset.qs
        if not global_qs.exists():
            return Response({"detail": "Data not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Business-wide Global Summary
        global_summary = global_qs.aggregate(
            total_quantity_sold=Coalesce(Sum("quantity"), Value(0)),
            total_revenue=Coalesce(Sum(F("quantity") * F("selling_price")), Value(0, output_field=DecimalField())),
            total_profit=Coalesce(Sum(F("quantity") * F("product__net_profit")), Value(0, output_field=DecimalField())),
            total_cost=Coalesce(Sum(F("quantity") * F("product__cost_price")), Value(0, output_field=DecimalField())),
        )

        # 2. Determine which branches to report on
        if user.role_name == UserRole.OWNER:
            if branch_id:
                branches = Branch.objects.filter(id=branch_id, business=user.business)
            else:
                branches = Branch.objects.filter(business=user.business)
        else:
            assigned_branches = user.branches
            if branch_id:
                branches = assigned_branches.filter(id=branch_id)
            else:
                branches = assigned_branches

        branch_data_list = []
        for branch in branches:
            branch_qs = global_qs.filter(invoice__branch=branch)
            
            # Aggregate stats for this specific branch
            branch_summary = branch_qs.aggregate(
                total_quantity_sold=Coalesce(Sum("quantity"), Value(0)),
                total_revenue=Coalesce(Sum(F("quantity") * F("selling_price")), Value(0, output_field=DecimalField())),
                total_profit=Coalesce(Sum(F("quantity") * F("product__net_profit")), Value(0, output_field=DecimalField())),
                total_cost=Coalesce(Sum(F("quantity") * F("product__cost_price")), Value(0, output_field=DecimalField())),
            )
            
            if branch_summary['total_quantity_sold'] == 0:
                continue # Skip empty branches in results

            # Per-branch ranked products (without explicit rank numbering)
            branch_products = list(
                branch_qs
                .values(
                    "product_id",
                    product_name=F("product__name"),
                    category_name=F("product__product_category__name"),
                )
                .annotate(
                    total_quantity_sold=Sum("quantity"),
                    total_revenue=Sum(F("quantity") * F("selling_price")),
                    total_profit=Sum(F("quantity") * F("product__net_profit")),
                    total_cost=Sum(F("quantity") * F("product__cost_price")),
                )
                .order_by("-total_revenue")
            )

            branch_data_list.append({
                "branch_id": branch.id,
                "summary": branch_summary,
                "general_summary": global_summary if branch_id else None,
                "products": branch_products
            })

        data = {
            "summary": global_summary,
            "branch": branch_data_list
        }
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        cache.set(cache_key, serializer.data, 60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get Category Performance",
        parameters=[ProductPerformanceFilterSerializer],
        responses={200: CategoryPerformanceSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="category/performance")
    def category_performance(self, request):
        cache_key = make_cache_key(request, "analytics", "category_performance", request.user)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        queryset = self.filter_queryset(self.get_queryset())
        if not queryset.exists():
            return Response({"detail": "Data not found"}, status=status.HTTP_404_NOT_FOUND)

        data = (
            queryset
            .values("product__product_category")
            .annotate(
                category_id=F("product__product_category"),
                category_name=F("product__product_category__name"),
                total_revenue=Sum(F("quantity") * F("selling_price")),
                total_profit=Sum(F("quantity") * F("product__net_profit")),
                total_quantity_sold=Sum("quantity"),
                product_count=Count("product", distinct=True)
            )
            .order_by("-total_revenue")
        )

        serializer = self.get_serializer(data, many=True)
        cache.set(cache_key, serializer.data, 60 * 5)
        return Response(serializer.data, status=status.HTTP_200_OK)
