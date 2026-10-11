from django.core.cache import cache
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog
from apps.base.views.base_view import BaseViewSet
from apps.master.utils.cache import make_cache_key, invalidate_cache
from apps.notification.mixins import CreateReminderMixin
from apps.supplier.filters import PurchaseOrderFilter
from apps.supplier.models import PurchaseOrder, OrderStatus
from apps.supplier.serializers import PurchaseOrderSerializer
from apps.supplier.utils.purchase_order_inventory import update_purchase_order_inventory_stock


from apps.supplier.views.base_order import BaseOrderViewSetMixin

class PurchaseOrderViewSet(BaseOrderViewSetMixin, CreateReminderMixin, ActivityLogMixin, BaseViewSet, ModelViewSet):
    cache_prefix = "purchase_order"
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    filterset_class = PurchaseOrderFilter
    activity_module = ActivityLog.Module.SUPPLIER

    # list, perform_create, perform_update, perform_destroy handled by BaseOrderViewSetMixin

    @action(detail=True, methods=['post'], url_path='delivered')
    @transaction.atomic
    def delivered(self, request, pk=None):
        try:
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
        except (Http404, PermissionDenied):
            raise
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

