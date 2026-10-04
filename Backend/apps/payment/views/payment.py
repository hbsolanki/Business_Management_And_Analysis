from rest_framework import mixins
from django.db.models import Q

from apps.base.views.base_view import BaseViewSet
from apps.base.permission.model_permissions import ModelPermissions
from apps.master.permission.custom_permissions import IsOwnerOrManager, BranchWorkPermission
from apps.employee.models import UserRole
from apps.payment.models import Payment
from apps.payment.serializers import (
    PaymentSerializer,
    PaymentFilterSerializer,
)
from apps.payment.filters import PaymentFilter

class PaymentViewSet(BaseViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin):
    """Read-only listing of all payment records for the authenticated business."""
    permission_classes = [ModelPermissions, IsOwnerOrManager | BranchWorkPermission]
    required_work = "INVOICE"
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter
    pagination_class = None

    def get_queryset(self):
        return (
            super().get_queryset()
            .select_related("gateway_detail")
            .order_by("-created_at")
        )

    def apply_branch_filter(self, queryset, user):
        if user.role_name == UserRole.MANAGER:
            assigned_branches = user.branches.all()
            return queryset.filter(
                Q(invoice_payment__invoice__branch__in=assigned_branches) |
                Q(invoice_payment__isnull=True)
            )
        if user.role_name == UserRole.EMPLOYEE:
            return queryset.filter(
                invoice_payment__invoice__branch__in=user.branches
            )
        return queryset

