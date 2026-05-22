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

    def get_queryset(self):
        user = self.request.user
        
        if self.action == 'invoices':
            queryset = Invoice.objects.filter(business=user.business).select_related('gst', 'customer')
        elif self.action == 'purchase_orders':
            queryset = PurchaseOrder.objects.filter(business=user.business, status=OrderStatus.DELIVERED).select_related('gst', 'supplier')
        elif self.action == 'expenses':
            queryset = Expense.objects.filter(business=user.business).select_related('gst', 'category')
        elif self.action == 'cost_categories':
            month = self.request.query_params.get('month')
            year = self.request.query_params.get('year', datetime.now().year)
            queryset = MonthlyCostCategory.objects.filter(
                monthly_summary__business=user.business,
                monthly_summary__month=month,
                monthly_summary__year=year
            ).select_related('cost_category', 'monthly_summary')
        else:
            queryset = MonthlyGSTSummary.objects.filter(business=user.business)

        # Apply Branch Isolation (Manual implementation of BaseViewSet logic for custom action compatibility)
        branch_id = self.request.query_params.get('branch')
        if hasattr(queryset.model, 'branch'):
            from apps.employee.models import UserRole
            if user.role_name == UserRole.OWNER:
                if branch_id:
                    queryset = queryset.filter(branch_id=branch_id)
            else:
                # Managers/Employees only see assigned branches
                assigned_branches = user.branches.all()
                if branch_id:
                    queryset = queryset.filter(branch_id=branch_id, branch__in=assigned_branches)
                else:
                    queryset = queryset.filter(branch__in=assigned_branches)
        
        return queryset.order_by('-id')

    def get_filterset_class(self):
        mapping = {
            'list': MonthlyGSTSummaryFilter,
            'invoices': InvoiceLedgerFilter,
            'purchase_orders': PurchaseOrderLedgerFilter,
            'expenses': ExpenseLedgerFilter,
        }
        return mapping.get(self.action)

    def get_serializer_class(self):
        mapping = {
            'invoices': InvoiceLedgerSerializer,
            'purchase_orders': PurchaseOrderLedgerSerializer,
            'expenses': ExpenseLedgerSerializer,
            'cost_categories': MonthlyCostCategoryLedgerSerializer,
        }
        return mapping.get(self.action, self.serializer_class)

    def _get_ledger_response(self, queryset):
        """Returns full ledger datasets for consistent analytics visualization."""
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def invoices(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        return self._get_ledger_response(queryset)

    @action(detail=False, methods=['get'])
    def purchase_orders(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        return self._get_ledger_response(queryset)

    @action(detail=False, methods=['get'])
    def expenses(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        return self._get_ledger_response(queryset)

    @action(detail=False, methods=['get'])
    def cost_categories(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        category_id = request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(cost_category_id=category_id)
            
        return self._get_ledger_response(queryset)
