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
from apps.master.utils.cache import invalidate_cache, make_cache_key
from apps.notification.mixins import CreateReminderMixin
from apps.supplier.filters import SalesOrderFilter
from apps.supplier.models import OrderStatus, SalesOrder
from apps.supplier.serializers.sales_order import SalesOrderSerializer


from apps.supplier.views.base_order import BaseOrderViewSetMixin

class SalesOrderViewSet(BaseOrderViewSetMixin, CreateReminderMixin, ActivityLogMixin, BaseViewSet, ModelViewSet):
    cache_prefix = "sales_order"
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer
    filterset_class = SalesOrderFilter
    activity_module = ActivityLog.Module.SUPPLIER

    # list, perform_create, perform_update, perform_destroy handled by BaseOrderViewSetMixin

    @action(detail=True, methods=['post'], url_path='deliver')
    @transaction.atomic
    def deliver(self, request, pk=None):
        try:
            so = self.get_object()
            if so.status == OrderStatus.DELIVERED:
                return Response({"error": "Sales order already delivered"}, status=status.HTTP_400_BAD_REQUEST)
            
            if so.status == OrderStatus.CANCELLED:
                return Response({"error": "Cancelled orders cannot be delivered."}, status=status.HTTP_400_BAD_REQUEST)
            
            so.status = OrderStatus.DELIVERED
            so.delivered_at = timezone.now()
            so.save()

            # Log activity
            ActivityLog.objects.log(
                business=so.business,
                actor=self.request.user,
                action=ActivityLog.Action.CUSTOM,
                module=self.activity_module,
                target_model="SalesOrder",
                target_id=so.id,
                message=f"Delivered Sales Order #{so.id}"
            )

            # Trigger stock update (OUT)
            # update_purchase_order_inventory_stock(sales_order=so, action="OUT", request=self.request)
            # Trigger status sync to linked PO
            from apps.supplier.tasks.sales_order_tasks import synchronize_purchase_order_status_update_to_customer_task
            transaction.on_commit(lambda: synchronize_purchase_order_status_update_to_customer_task.delay(so.id))
            from apps.supplier.tasks.sales_order_invoice_tasks import create_invoice_from_sales_order_task
            transaction.on_commit(lambda: create_invoice_from_sales_order_task.delay(so.id))

            # Invalidate cache
            invalidate_cache("sales_order", "list", self.request.user)

            return Response({"message": "Sales order delivered and inventory updated"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

