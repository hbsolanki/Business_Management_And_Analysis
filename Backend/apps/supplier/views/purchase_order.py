from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog
from apps.base.views.base_view import BaseViewSet
from apps.master.utils.cache import make_cache_key, invalidate_cache
from apps.supplier.filters import PurchaseOrderFilter
from apps.supplier.models import PurchaseOrder, OrderStatus
from apps.supplier.serializers import PurchaseOrderSerializer
from apps.supplier.utils.purchase_order_inventory import update_purchase_order_inventory_stock


class PurchaseOrderViewSet(ActivityLogMixin, ModelViewSet, BaseViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    filterset_class = PurchaseOrderFilter
    activity_module = ActivityLog.Module.SUPPLIER

    def list(self, request, *args, **kwargs):
        cache_key = make_cache_key(request, "purchase_order", "list", request.user)
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 60 * 15)
        return Response(response.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_cache("purchase_order", "list", self.request.user)
        
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_cache("purchase_order", "list", self.request.user)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_cache("purchase_order", "list", self.request.user)

    @action(detail=True, methods=['post'], url_path='delivered')
    @transaction.atomic
    def delivered(self, request, pk=None):
        po = self.get_object()
        if po.status == OrderStatus.DELIVERED:
            return Response({"error": "Purchase order already received"}, status=status.HTTP_400_BAD_REQUEST)
        
        if po.status == OrderStatus.CANCELLED:
            return Response({"error": "Cancelled orders cannot be received."}, status=status.HTTP_400_BAD_REQUEST)
        
        po.status = OrderStatus.DELIVERED
        po.received_at = timezone.now()
        po.save()

        # Log activity
        ActivityLog.objects.log(
            business=po.business,
            actor=self.request.user,
            action=ActivityLog.Action.CUSTOM,
            module=self.activity_module,
            target_model="PurchaseOrder",
            target_id=po.id,
            message=f"Received Purchase Order #{po.id} from {po.supplier.name}"
        )

        # Trigger stock update
        update_purchase_order_inventory_stock(purchase_order=po, request=self.request)

        # Trigger status sync to linked SO
        from apps.supplier.tasks.purchase_order_tasks import synchronize_purchase_order_status_update_to_supplier_task
        transaction.on_commit(lambda: synchronize_purchase_order_status_update_to_supplier_task.delay(po.id))

        # Invalidate cache for purchase orders
        invalidate_cache("purchase_order", "list", self.request.user)

        return Response({"message": "Purchase order received and inventory updated"}, status=status.HTTP_200_OK)
