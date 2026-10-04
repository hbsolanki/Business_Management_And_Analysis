from django.db.models import Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.analytics.filters.month_financial import (
    MonthlySummaryMonthYearFilter,
    MonthlySummaryDateRangeFilter,
)
from apps.analytics.serializers.month_financial import (
    MonthFinancialBreakdownSerializer,
    MonthNetProfitSerializer,
    FinancialTrendSerializer,
    TaxAnalyticsSerializer,
    ProfitMarginSerializer
)
from apps.analytics.serializers.filter.month_financial import (
    MonthlySummaryMonthYearFilterSerializer,
    MonthlySummaryDateRangeFilterSerializer
)
from apps.cost.models import MonthlyFinancialSummary, MonthlyCostCategory
from drf_spectacular.utils import extend_schema
from django.core.cache import cache
from apps.master.utils.cache import make_cache_key
from apps.analytics.permission import CanViewMonthFinancialAnalytics
from apps.base.views.base_view import BaseViewSet
from apps.employee.models import UserRole


class MonthFinancialSummaryViewSet(BaseViewSet):
    permission_classes = [CanViewMonthFinancialAnalytics]
    queryset = MonthlyFinancialSummary.objects.all()

    def get_serializer_class(self):
        if self.action == "month_breakdown":
            return MonthFinancialBreakdownSerializer
        elif self.action == "month_net_profit":
            return MonthNetProfitSerializer
        elif self.action == "financial_trend":
            return FinancialTrendSerializer
        elif self.action == "tax_analytics":
            return TaxAnalyticsSerializer
        elif self.action == "profit_margins":
            return ProfitMarginSerializer
        return None

    def get_filterset_class(self):
        if self.action == "month_breakdown":
            return MonthlySummaryMonthYearFilter
        elif self.action in ["month_net_profit", "financial_trend", "tax_analytics", "profit_margins"]:
            return MonthlySummaryDateRangeFilter
        return None

    def filter_queryset(self, queryset):
        filterset_class = self.get_filterset_class()
        if not filterset_class:
            return queryset
        return filterset_class(self.request.GET, queryset=queryset).qs

    @extend_schema(
        summary="Get Month Breakdown",
        parameters=[MonthlySummaryMonthYearFilterSerializer],
        responses={200: MonthFinancialBreakdownSerializer}
    )
    @action(detail=False, methods=["get"], url_path="breakdown")
    def month_breakdown(self, request):
        try:
            cache_key = make_cache_key(request, "analytics", "month_breakdown", request.user)
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            user = request.user
            branch_id = request.query_params.get('branch')
            queryset = self.filter_queryset(self.get_queryset())

            if user.role_name == UserRole.OWNER and not branch_id:
                summary = queryset.aggregate(
                    salary_expenses=Coalesce(Sum('salary_expenses'), Value(0, output_field=DecimalField())),
                    cost_of_goods_sold=Coalesce(Sum('cost_of_goods_sold'), Value(0, output_field=DecimalField())),
                    total_revenue=Coalesce(Sum('total_revenue'), Value(0, output_field=DecimalField())),
                    operating_expenses=Coalesce(Sum('operating_expenses'), Value(0, output_field=DecimalField())),
                    invoice_count_total=Coalesce(Sum('invoice_count'), Value(0)),
                    input_gst_total=Coalesce(Sum('input_gst'), Value(0, output_field=DecimalField())),
                    output_gst_total=Coalesce(Sum('output_gst'), Value(0, output_field=DecimalField())),
                )
                # Calculate derived metrics
                total_revenue = summary['total_revenue']
                cogs = summary['cost_of_goods_sold']
                operating_ex = summary['operating_expenses']
                salary_ex = summary['salary_expenses']
                input_gst = summary['input_gst_total']
                output_gst = summary['output_gst_total']

                data = {
                    "year": request.query_params.get('year'),
                    "month": request.query_params.get('month'),
                    "total_revenue": total_revenue,
                    "cost_of_goods_sold": cogs,
                    "operating_expenses": operating_ex,
                    "salary_expenses": salary_ex,
                    "gross_profit": total_revenue - cogs,
                    "total_expenses": operating_ex + salary_ex,
                    "net_profit_before_tax": (total_revenue - cogs) - (operating_ex + salary_ex),
                    "invoice_count": summary['invoice_count_total'],
                    "input_gst": input_gst,
                    "output_gst": output_gst,
                    "gst_payable": output_gst - input_gst,
                }

                cost_items = (
                    MonthlyCostCategory.objects.filter(monthly_summary__in=queryset)
                    .values('cost_category__name')
                    .annotate(total_cost=Coalesce(Sum('cost'), Value(0, output_field=DecimalField())))
                )

                data = {
                    "year": request.query_params.get('year'),
                    "month": request.query_params.get('month'),
                    **summary,
                    "cost_category_items": [
                        {"category_name": item['cost_category__name'], "cost": item['total_cost']}
                        for item in cost_items
                    ]
                }
                cache.set(cache_key, data, 60 * 5)
                return Response(data, status=status.HTTP_200_OK)

            instance = queryset.first()
            if not instance:
                return Response(
                    {"detail": "Data not found for given month and year"},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(instance)
            cache.set(cache_key, serializer.data, 60 * 5)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get Month Net Profit",
        parameters=[MonthlySummaryDateRangeFilterSerializer],
        responses={200: MonthNetProfitSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="netprofit")
    def month_net_profit(self, request):
        try:
            cache_key = make_cache_key(request, "analytics", "month_net_profit", request.user)
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            user = request.user
            branch_id = request.query_params.get('branch')
            queryset = self.filter_queryset(self.get_queryset())

            if user.role_name == UserRole.OWNER and not branch_id:
                raw_data = list(
                    queryset.values('month', 'year')
                    .annotate(
                        sum_revenue=Coalesce(Sum('total_revenue'), Value(0, output_field=DecimalField())),
                        sum_cogs=Coalesce(Sum('cost_of_goods_sold'), Value(0, output_field=DecimalField())),
                        sum_op_ex=Coalesce(Sum('operating_expenses'), Value(0, output_field=DecimalField())),
                        sum_salary=Coalesce(Sum('salary_expenses'), Value(0, output_field=DecimalField())),
                    )
                    .order_by('-year', '-month')
                )
                data = []
                for item in raw_data:
                    item['net_profit_before_tax'] = item['sum_revenue'] - item['sum_cogs'] - item['sum_op_ex'] - item['sum_salary']
                    data.append(item)

                cache.set(cache_key, data, 60 * 5)
                return Response(data, status=status.HTTP_200_OK)

            if not queryset.exists():
                return Response({"detail": "Data not found"}, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(queryset, many=True)
            cache.set(cache_key, serializer.data, 60 * 5)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get Financial Trends",
        parameters=[MonthlySummaryDateRangeFilterSerializer],
        responses={200: FinancialTrendSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="financial_trend")
    def financial_trend(self, request):
        try:
            cache_key = make_cache_key(request, "analytics", "financial_trend", request.user)
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            user = request.user
            branch_id = request.query_params.get('branch')
            queryset = self.filter_queryset(self.get_queryset())

            if user.role_name == UserRole.OWNER and not branch_id:
                raw_data = list(
                    queryset.values('month', 'year')
                    .annotate(
                        sum_revenue=Coalesce(Sum('total_revenue'), Value(0, output_field=DecimalField())),
                        sum_cogs=Coalesce(Sum('cost_of_goods_sold'), Value(0, output_field=DecimalField())),
                        sum_op_ex=Coalesce(Sum('operating_expenses'), Value(0, output_field=DecimalField())),
                        sum_salary=Coalesce(Sum('salary_expenses'), Value(0, output_field=DecimalField())),
                    )
                    .order_by('-year', '-month')
                )
                data = []
                for item in raw_data:
                    revenue = item['sum_revenue']
                    cogs = item['sum_cogs']
                    expenses = item['sum_op_ex'] + item['sum_salary']
                    item['total_revenue'] = revenue
                    item['total_expenses'] = expenses
                    item['gross_profit'] = revenue - cogs
                    item['net_profit_before_tax'] = item['gross_profit'] - expenses
                    data.append(item)

                cache.set(cache_key, data, 60 * 5)
                return Response(data, status=status.HTTP_200_OK)

            serializer = self.get_serializer(queryset, many=True)
            cache.set(cache_key, serializer.data, 60 * 5)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get Tax Analytics",
        parameters=[MonthlySummaryDateRangeFilterSerializer],
        responses={200: TaxAnalyticsSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="tax_analytics")
    def tax_analytics(self, request):
        try:
            cache_key = make_cache_key(request, "analytics", "tax_analytics", request.user)
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            user = request.user
            branch_id = request.query_params.get('branch')
            queryset = self.filter_queryset(self.get_queryset())

            if user.role_name == UserRole.OWNER and not branch_id:
                raw_data = list(
                    queryset.values('month', 'year')
                    .annotate(
                        sum_input_gst=Coalesce(Sum('input_gst'), Value(0, output_field=DecimalField())),
                        sum_output_gst=Coalesce(Sum('output_gst'), Value(0, output_field=DecimalField())),
                    )
                    .order_by('-year', '-month')
                )
                data = []
                for item in raw_data:
                    item['input_gst'] = item['sum_input_gst']
                    item['output_gst'] = item['sum_output_gst']
                    item['gst_payable'] = item['sum_output_gst'] - item['sum_input_gst']
                    data.append(item)

                cache.set(cache_key, data, 60 * 5)
                return Response(data, status=status.HTTP_200_OK)

            serializer = self.get_serializer(queryset, many=True)
            cache.set(cache_key, serializer.data, 60 * 5)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get Profit Margins",
        parameters=[MonthlySummaryDateRangeFilterSerializer],
        responses={200: ProfitMarginSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="profit_margins")
    def profit_margins(self, request):
        try:
            cache_key = make_cache_key(request, "analytics", "profit_margins", request.user)
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            user = request.user
            branch_id = request.query_params.get('branch')
            queryset = self.filter_queryset(self.get_queryset())

            if user.role_name == UserRole.OWNER and not branch_id:
                raw_data = (
                    queryset.values('month', 'year')
                    .annotate(
                        sum_revenue=Coalesce(Sum('total_revenue'), Value(0, output_field=DecimalField())),
                        sum_cogs=Coalesce(Sum('cost_of_goods_sold'), Value(0, output_field=DecimalField())),
                        sum_op_ex=Coalesce(Sum('operating_expenses'), Value(0, output_field=DecimalField())),
                        sum_salary=Coalesce(Sum('salary_expenses'), Value(0, output_field=DecimalField())),
                    )
                    .order_by('-year', '-month')
                )

                results = []
                for item in raw_data:
                    revenue = float(item['sum_revenue'])
                    cogs = float(item['sum_cogs'])
                    expenses = float(item['sum_op_ex']) + float(item['sum_salary'])
                    
                    net_profit = revenue - cogs - expenses
                    gross_profit = revenue - cogs
                    
                    item['total_revenue'] = revenue
                    item['net_profit_before_tax'] = net_profit
                    item['gross_profit'] = gross_profit
                    item['net_profit_margin'] = round((net_profit / revenue * 100), 2) if revenue > 0 else 0.0
                    item['gross_profit_margin'] = round((gross_profit / revenue * 100), 2) if revenue > 0 else 0.0
                    results.append(item)

                cache.set(cache_key, results, 60 * 5)
                return Response(results, status=status.HTTP_200_OK)

            serializer = self.get_serializer(queryset, many=True)
            cache.set(cache_key, serializer.data, 60 * 5)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
