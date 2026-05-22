from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status
from apps.base.views.base_view import BaseViewSet
from apps.invoice.models import Invoice

from apps.invoice.serializers.invoice import InvoiceSerializer
from apps.invoice.filters import InvoiceFilter
from apps.subscription.decorators.limits import limit_required
from django.db import transaction
from apps.activity_log.models import ActivityLog
from apps.activity_log.mixins import ActivityLogMixin
from apps.business.models import Branch
from apps.inventory.models import Inventory


class InvoiceViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    queryset = Invoice.objects.all()
    activity_module = ActivityLog.Module.INVOICE
    filterset_class = InvoiceFilter

    def get_serializer_context(self):
        context = super().get_serializer_context()
            
        branch_id = self.request.data.get('branch_id') or self.request.query_params.get('branch')
        branch = None

        if branch_id:
            branch=Branch.objects.filter(id=branch_id,is_active=True).first()
                
        if branch:
            context['inventory'] = Inventory.objects.filter(branch=branch).first()

        return context

    def get_queryset(self):
        return (super().get_queryset()
        .select_related("customer")
        .order_by("-created_at"))

    serializer_class = InvoiceSerializer

    @limit_required("max_invoices", usage_field="invoices_created")
    @transaction.atomic
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # usage update
        from django.core.cache import cache
        from apps.subscription.utils.entitlements import get_active_subscription, increment_usage

        subscription = get_active_subscription(request.user.business)
        if subscription:
            increment_usage(subscription, "invoices_created")
            cache.delete(f"subscription:usage:{subscription.id}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)


