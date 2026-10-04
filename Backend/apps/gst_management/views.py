from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.gst_management.models import MonthlyGSTSummary
from apps.gst_management.serializers import (
    MonthlyGSTSummarySerializer, InvoiceLedgerSerializer, 
    PurchaseOrderLedgerSerializer, 
    ExpenseLedgerSerializer, MonthlyCostCategoryLedgerSerializer
)
from apps.gst_management.filters import (
    MonthlyGSTSummaryFilter, InvoiceLedgerFilter, 
    PurchaseOrderLedgerFilter, 
    ExpenseLedgerFilter
)

from apps.base.views.base_view import BaseViewSet
from apps.invoice.models import Invoice
from apps.supplier.models import PurchaseOrder, OrderStatus
from apps.cost.models import Expense, MonthlyCostCategory
from datetime import datetime

from apps.master.permission.custom_permissions import IsOwnerOrManager, BranchWorkPermission
from apps.notification.mixins import CreateReminderMixin

class MonthlyGSTSummaryViewSet(CreateReminderMixin, BaseViewSet, viewsets.ReadOnlyModelViewSet):
    serializer_class = MonthlyGSTSummarySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManager, BranchWorkPermission]
    pagination_class = None
    serializer_action_classes = {
        'invoices': InvoiceLedgerSerializer,
        'purchase_orders': PurchaseOrderLedgerSerializer,
        'expenses': ExpenseLedgerSerializer,
        'cost_categories': MonthlyCostCategoryLedgerSerializer,
    }

    def get_queryset(self):
        user = self.request.user

        if self.action == 'invoices':
            qs = Invoice.objects.filter(business=user.business).select_related('gst', 'customer').order_by('-id')
        elif self.action == 'purchase_orders':
            qs = PurchaseOrder.objects.filter(business=user.business, status=OrderStatus.DELIVERED).select_related('gst', 'supplier').order_by('-id')
        elif self.action == 'expenses':
            qs = Expense.objects.filter(business=user.business).select_related('gst', 'category').order_by('-id')
        elif self.action == 'cost_categories':
            month = self.request.query_params.get('month')
            year = self.request.query_params.get('year', datetime.now().year)
            qs = MonthlyCostCategory.objects.filter(
                monthly_summary__business=user.business,
                monthly_summary__month=month,
                monthly_summary__year=year
            ).select_related('cost_category', 'monthly_summary').order_by('-id')
        else:
            qs = MonthlyGSTSummary.objects.filter(business=user.business).order_by('-id')

        return self.apply_branch_filter(qs, user)

    def apply_branch_filter(self, queryset, user):
        # Each action uses a different queryset model; branch filtering is applied generically
        from apps.employee.models import UserRole
        branch_id = self.request.query_params.get('branch')
        if queryset.model.__name__ == 'MonthlyCostCategory':
            if user.role_name == UserRole.OWNER:
                if branch_id:
                    return queryset.filter(monthly_summary__branch_id=branch_id)
                return queryset
            assigned_branches = user.branches.all()
            if branch_id:
                return queryset.filter(monthly_summary__branch_id=branch_id, monthly_summary__branch__in=assigned_branches)
            return queryset.filter(monthly_summary__branch__in=assigned_branches)

        if not hasattr(queryset.model, 'branch'):
            return queryset
        if user.role_name == UserRole.OWNER:
            if branch_id:
                return queryset.filter(branch_id=branch_id)
            return queryset
        assigned_branches = user.branches.all()
        if branch_id:
            return queryset.filter(branch_id=branch_id, branch__in=assigned_branches)
        return queryset.filter(branch__in=assigned_branches)

    def get_serializer_class(self):
        return self.serializer_action_classes.get(self.action, self.serializer_class)

    def _get_ledger_response(self, queryset):
        """Returns full ledger datasets for consistent analytics visualization."""
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def invoices(self, request):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            return self._get_ledger_response(queryset)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def purchase_orders(self, request):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            return self._get_ledger_response(queryset)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def expenses(self, request):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            return self._get_ledger_response(queryset)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def cost_categories(self, request):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            category_id = request.query_params.get('category_id')
            if category_id:
                queryset = queryset.filter(cost_category_id=category_id)
                
            return self._get_ledger_response(queryset)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
