from rest_framework import status, mixins, serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.base.views.base_view import BaseViewSet
from apps.base.permission.model_permissions import ModelPermissions
from apps.master.permission.custom_permissions import IsOwnerOrManager, BranchWorkPermission
from apps.employee.models import UserRole
from apps.payment.models import InvoicePayment
from apps.payment.serializers import (
    InvoicePaymentSerializer,
    InitiateInvoicePaymentSerializer,
    OfflineInvoicePaymentSerializer,
    RefundPaymentSerializer,
    SyncInvoicePaymentStatusSerializer,
    PaymentSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend
from apps.payment.filters import InvoicePaymentFilter

from drf_spectacular.utils import extend_schema

class InvoicePaymentViewSet(BaseViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin):
    """Invoice payment operations including online payment initiation, offline logging, and refunds."""
    permission_classes = [ModelPermissions, IsOwnerOrManager | BranchWorkPermission]
    required_work = "INVOICE"
    queryset = InvoicePayment.objects.all()
    serializer_class = InvoicePaymentSerializer
    pagination_class = None
    filterset_class = InvoicePaymentFilter

    def get_queryset(self):
        return (
            super().get_queryset()
            .select_related("payment", "payment__gateway_detail", "invoice", "invoice__customer")
            .order_by("-payment__created_at")
        )

    def apply_business_filter(self, queryset, user):
        return queryset.filter(payment__business=user.business)

    def apply_branch_filter(self, queryset, user):
        if user.role_name == UserRole.MANAGER:
            return queryset.filter(invoice__branch__in=user.branches.all())
        return queryset

    def get_serializer_class(self):
        if self.action == "initiate_online":
            return InitiateInvoicePaymentSerializer
        if self.action == "record_offline":
            return OfflineInvoicePaymentSerializer
        if self.action == "sync_status":
            return SyncInvoicePaymentStatusSerializer
        if self.action == "refund":
            return RefundPaymentSerializer
        return InvoicePaymentSerializer

    @extend_schema(
        summary="Initiate online invoice payment",
        request=InitiateInvoicePaymentSerializer,
        responses={201: serializers.Serializer}  # returns checkout link and id
    )
    @action(detail=False, methods=["post"], url_path="initiate-online")
    def initiate_online(self, request, *args, **kwargs):
        """Initiates an online Stripe Checkout Session for an invoice payment."""
        return self.create(request, *args, **kwargs)

    @extend_schema(
        summary="Sync online payment status",
        request=SyncInvoicePaymentStatusSerializer,
        responses={200: serializers.Serializer}
    )
    @action(detail=False, methods=["post"], url_path="sync-status")
    def sync_status(self, request, *args, **kwargs):
        """Manually syncs and verifies the Stripe payment status for an invoice."""
        response = self.create(request, *args, **kwargs)
        response.status_code = status.HTTP_200_OK
        return response

    @extend_schema(
        summary="Record offline invoice payment",
        request=OfflineInvoicePaymentSerializer,
        responses={201: PaymentSerializer}
    )
    @action(detail=False, methods=["post"], url_path="record-offline")
    def record_offline(self, request, *args, **kwargs):
        """Records a manual offline invoice payment and updates the invoice payment status."""
        response = self.create(request, *args, **kwargs)
        # Natively serialize using standard PaymentSerializer to match response scheme expectations
        if response.status_code == status.HTTP_201_CREATED:
            payment = self.get_serializer().instance
            if payment:
                response.data = PaymentSerializer(payment, context=self.get_serializer_context()).data
        return response

    @extend_schema(
        summary="Refund invoice payment",
        request=RefundPaymentSerializer,
        responses={200: PaymentSerializer}
    )
    @action(detail=False, methods=["post"], url_path="refund")
    def refund(self, request, *args, **kwargs):
        """Initiates a full or partial refund for a Stripe invoice payment."""
        response = self.create(request, *args, **kwargs)
        response.status_code = status.HTTP_200_OK
        if response.status_code == status.HTTP_200_OK:
            payment = self.get_serializer().instance
            if payment:
                response.data = PaymentSerializer(payment, context=self.get_serializer_context()).data
        return response
