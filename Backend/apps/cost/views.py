from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from django.db.models import Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from apps.base.views.base_view import BaseViewSet
from apps.cost.models import CostCategory, MonthlyCostCategory, MonthlyFinancialSummary
from apps.cost.serializers.cost_category_month import (
    MonthlyCostCategorySerializer,
    MonthlyCostCategoryBulkSerializer,
)
from apps.cost.serializers.cost_category import CostCategorySerializer
from apps.activity_log.models import ActivityLog
from apps.activity_log.mixins import ActivityLogMixin


from apps.cost.serializers.cost_month import MonthlyFinancialSummaryDetailSerializer
from apps.cost.filters import MonthCostFilter, MonthlyCostCategoryFilter, CostCategoryFilter
from apps.cost.serializers.filter import (
    MonthlyCostCategoryFilterSerializer,
    CostMonthFilterSerializer
)
from rest_framework.mixins import ListModelMixin
from apps.user.models import User
from apps.employee.models import UserRole
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter


@extend_schema_view(
    list=extend_schema(
        summary="List cost categories",
    )
)
class CostCategoryViewSet(ActivityLogMixin,BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.COST
    serializer_class = CostCategorySerializer
    queryset = CostCategory.objects.all()
    filterset_class = CostCategoryFilter

    def get_queryset(self):
        return super().get_queryset()


@extend_schema_view(
    list=extend_schema(
        summary="List monthly cost categories",
        parameters=[MonthlyCostCategoryFilterSerializer]
    )
)
class MonthlyCostCategoryViewSet(ActivityLogMixin,BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.COST
    filterset_class = MonthlyCostCategoryFilter
    queryset = MonthlyCostCategory.objects.all()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        queryset = queryset.filter(monthly_summary__business=user.business)
        branch_id = self.request.query_params.get('branch')

        if user.role_name == UserRole.OWNER:
            if branch_id:
                queryset = queryset.filter(monthly_summary__branch_id=branch_id)
        else:
            assigned_branches = user.branches
            if branch_id:
                queryset = queryset.filter(monthly_summary__branch_id=branch_id, monthly_summary__branch__in=assigned_branches)
            else:
                queryset = queryset.filter(monthly_summary__branch__in=assigned_branches)

        return queryset.select_related('cost_category', 'monthly_summary')

    def get_serializer_class(self):
        if self.action == "create":
            return MonthlyCostCategoryBulkSerializer
        return MonthlyCostCategorySerializer

    def list(self, request, *args, **kwargs):
        user = request.user
        branch_id = request.query_params.get('branch')

        if user.role_name == UserRole.OWNER and not branch_id:
            queryset = self.filter_queryset(self.get_queryset())

            totals = (
                queryset
                .values("cost_category_id")
                .annotate(
                    total_cost=Coalesce(Sum("cost"), Value(0, output_field=DecimalField()))
                )
            )

            cost_map = {item["cost_category_id"]: item["total_cost"] for item in totals}
            categories = CostCategory.objects.filter(id__in=cost_map.keys())

            data = [
                {
                    "cost_category": CostCategorySerializer(cat).data,
                    "role": user.role_name,
                    "cost": str(cost_map[cat.id]),
                    "month": int(request.query_params.get('month', 0)) if request.query_params.get('month') else None,
                    "year": int(request.query_params.get('year', 0)) if request.query_params.get('year') else None,
                }
                for cat in categories
            ]
            return Response(data, status=status.HTTP_200_OK)

        return super().list(request, *args, **kwargs)


@extend_schema_view(
    list=extend_schema(
        summary="List monthly financial summaries",
        parameters=[CostMonthFilterSerializer]
    )
)
class CostMonthViewSet(BaseViewSet, ListModelMixin):
    activity_module = ActivityLog.Module.COST
    serializer_class = MonthlyFinancialSummaryDetailSerializer
    filterset_class = MonthCostFilter
    queryset = MonthlyFinancialSummary.objects.all()

    def get_queryset(self):
        return super().get_queryset()

from apps.cost.models import Expense
from apps.cost.serializers.expense import ExpenseSerializer

class ExpenseViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.COST
    serializer_class = ExpenseSerializer
    queryset = Expense.objects.all()

    def get_queryset(self):
        return super().get_queryset().order_by('-date', '-created_at')

    def perform_create(self, serializer):
        instance = serializer.save()
        self._update_gst_summary(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._update_gst_summary(instance)

    def perform_destroy(self, instance):
        business = instance.business
        month = instance.date.month
        year = instance.date.year
        instance.delete()
        
        try:
            from apps.gst_management.utils import aggregate_monthly_data
            aggregate_monthly_data(business=business, month=month, year=year)
        except Exception as e:
            print(f"Error updating GST summary after expense deletion: {e}")

    def _update_gst_summary(self, instance):
        try:
            from apps.gst_management.utils import aggregate_monthly_data
            aggregate_monthly_data(
                business=instance.business,
                month=instance.date.month,
                year=instance.date.year
            )
        except Exception as e:
            print(f"Error updating GST summary from expense: {e}")
