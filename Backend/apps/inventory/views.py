from django.core.cache import cache
from rest_framework import mixins

from apps.base.views.base_view import BaseViewSet
from apps.inventory.models import Inventory, InventoryProduct, InventoryTransaction
from apps.inventory.filters import InventoryProductFilter, InventoryTransactionFilter
from apps.inventory.serializers.inventory_product import InventoryProductSerializer
from apps.inventory.serializers.inventory_transaction import InventoryTransactionSerializer
from apps.master.utils.cache import invalidate_cache
from apps.activity_log.models import ActivityLog
from apps.activity_log.mixins import ActivityLogMixin
from drf_spectacular.utils import extend_schema, extend_schema_view
from apps.inventory.serializers.filter import (
    InventoryProductFilterSerializer,
    InventoryTransactionFilterSerializer
)

from apps.employee.models import UserRole, WorkType

class InventoryBaseViewSet(ActivityLogMixin, BaseViewSet):
    activity_module = ActivityLog.Module.INVENTORY
    queryset = Inventory.objects.all()

    def get_inventory(self):
        user = self.request.user
        branch_id = self.request.query_params.get('branch')

        if not branch_id:
            return None

        # 1. Get inventory by business and branch_id
        inventory = Inventory.objects.filter(business=user.business, branch_id=branch_id).first()

        if not inventory:
            return None

        # 2. If user is owner or superuser, return inventory
        if user.is_superuser or user.role_name == UserRole.OWNER:
            return inventory

        # 3. For Manager, check if they are assigned to this branch
        if user.role_name == UserRole.MANAGER:
            if user.branches.filter(id=branch_id).exists():
                return inventory

        # 4. For Employee, check if they have "INVENTORY" work assigned at this branch
        if user.role_name == UserRole.EMPLOYEE:
            if user.branch_works.filter(branch_id=branch_id, work_type=WorkType.INVENTORY).exists():
                return inventory

        return None

    def get_serializer_context(self):
        context = super().get_serializer_context()
        inventory = self.get_inventory()
        if isinstance(inventory, Inventory):
            context['inventory'] = inventory
        return context


@extend_schema_view(
    list=extend_schema(
        summary="List inventory products (stock)",
        parameters=[InventoryProductFilterSerializer]
    )
)
class InventoryProductViewSet(InventoryBaseViewSet, mixins.ListModelMixin):
    filterset_class = InventoryProductFilter
    serializer_class = InventoryProductSerializer
    queryset = InventoryProduct.objects.all()

    def get_queryset(self):
        inventory = self.get_inventory()
        if not inventory:
            return InventoryProduct.objects.none()

        return (
            InventoryProduct.objects
            .filter(inventory=inventory)
            .select_related("product", "inventory__branch")
            .order_by("-created_at", "-id")
        )


@extend_schema_view(
    list=extend_schema(
        summary="List inventory transactions",
        parameters=[InventoryTransactionFilterSerializer]
    ),
    create=extend_schema(
        summary="Create inventory transaction",
        description="Create a new stock in or stock out transaction."
    )
)
class InventoryTransactionViewSet(InventoryBaseViewSet, mixins.ListModelMixin, mixins.CreateModelMixin):
    filterset_class = InventoryTransactionFilter
    serializer_class = InventoryTransactionSerializer
    queryset = InventoryTransaction.objects.all()

    def get_queryset(self):
        inventory = self.get_inventory()
        if not inventory:
            return InventoryTransaction.objects.none()
        
        # Simple caching for single branch context
        cache_key = f"inventory:{inventory.id}:inventory_transaction"
        data = cache.get(cache_key)
        if data:
            return data
        
        data = InventoryTransaction.objects.filter(
            inventory=inventory
        ).select_related("inventory__branch").prefetch_related("items__product").order_by("-created_at", "-id").distinct()
        
        cache.set(cache_key, data, timeout=60 * 2)
        return data

    def perform_create(self, serializer):
        inventory = self.get_inventory()
        super().perform_create(serializer)
        invalidate_cache("inventory", "stock", self.request.user)
        if inventory:
            cache.delete(f"inventory:{inventory.id}:inventory_transaction")
