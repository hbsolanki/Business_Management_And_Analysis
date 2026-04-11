from django.db import transaction

from rest_framework import serializers, exceptions

from apps.base.serializers.base import BaseSerializer
from apps.business.serializers.branch import BranchSerializer
from apps.inventory.models import InventoryTransaction
from apps.product.models import Product
from apps.product.serializers.product import ProductSerializer
from apps.supplier.models import (
    OrderStatus,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
)
from apps.supplier.serializers import SupplierSerializer
from apps.supplier.utils import resync_order_inventory
from apps.business.models import Branch
from apps.employee.models import UserRole


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True
    )
    product = ProductSerializer(read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "product_id", "product", "quantity", "unit_cost", "subtotal"]
        read_only_fields = ["subtotal", "product"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be > 0")
        return value

    def create(self, validated_data):
        purchase_order = self.context.get("purchase_order")
        return PurchaseOrderItem.objects.create(
            purchase_order=purchase_order,
            product=validated_data["product_id"],
            quantity=validated_data["quantity"],
            unit_cost=validated_data["unit_cost"],
        )

    def update(self, instance, validated_data):
        validated_data.pop("product_id", None)

        instance.quantity = validated_data.get("quantity", instance.quantity)
        instance.unit_cost = validated_data.get("unit_cost", instance.unit_cost)
        instance.save()

        return instance


class PurchaseOrderSerializer(BaseSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=True)
    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), write_only=True, required=False, allow_null=True)
    supplier_id = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all(), write_only=True, required=True)
    supplier = SupplierSerializer( read_only=True)
    branch = BranchSerializer( read_only=True)

    class Meta(BaseSerializer.Meta):
        model = PurchaseOrder
        fields = BaseSerializer.Meta.fields + [
            "supplier_id",
            "branch_id",
            "status",
            "notes",
            "items",
            "supplier",
            "branch",
            "order_date",
            "total_amount",
            "received_at",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "order_date",
            "total_amount",
            "received_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            self.context["business"] = request.user.business

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least one item.")
        return value

    def validate_status(self, value):
        if self.instance:
            if self.instance.status == OrderStatus.FAILED:
                raise serializers.ValidationError("Failed orders cannot be updated.")
            if self.instance.status == OrderStatus.DELIVERED and value == OrderStatus.CANCELLED:
                raise serializers.ValidationError("Delivered orders cannot be cancelled.")
            if self.instance.status == OrderStatus.CANCELLED and value == OrderStatus.DELIVERED:
                raise serializers.ValidationError("Cancelled orders cannot be delivered.")
        return value

    def validate_branch_id(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        business = self.context.get("business")

        if business and value and value.business != business:
            raise serializers.ValidationError("Branch access denied.")

        if user and user.role_name != UserRole.OWNER:
            if not user.branches.filter(id=value.id).exists():
                raise exceptions.PermissionDenied("Branch access denied.")
        return value

    def validate_supplier_id(self, value):
        business = self.context.get("business")
        if business and value.business != business:
            raise serializers.ValidationError("Supplier ID invalid.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        validated_data["branch"] = validated_data.pop("branch_id", None)
        validated_data["supplier"] = validated_data.pop("supplier_id", None)

        purchase_order = PurchaseOrder.objects.create(
            business=self.context["business"],
            **validated_data
        )

        items = [
            PurchaseOrderItem(
                purchase_order=purchase_order,
                product=item_data["product_id"],
                quantity=item_data["quantity"],
                unit_cost=item_data["unit_cost"]
            )
            for item_data in items_data
        ]
        PurchaseOrderItem.objects.bulk_create(items)

        # Recalculate total
        purchase_order.total_amount = sum(item.quantity * item.unit_cost for item in items)
        purchase_order.save(update_fields=["total_amount"])

        # Trigger synchronization
        from apps.supplier.tasks.purchase_order_tasks import synchronize_purchase_order_to_supplier_task
        transaction.on_commit(lambda: synchronize_purchase_order_to_supplier_task.delay(purchase_order.id))

        return purchase_order

    @transaction.atomic
    def update(self, instance, validated_data):
        
        items_data = validated_data.pop("items", None)

        # Map branch_id and supplier_id to branch and supplier model fields
        if "branch_id" in validated_data:
            validated_data["branch"] = validated_data.pop("branch_id")
        if "supplier_id" in validated_data:
            validated_data["supplier"] = validated_data.pop("supplier_id")

        was_delivered = instance.status == OrderStatus.DELIVERED
        old_status = instance.status
        old_branch = instance.branch

        old_items_snapshot = None
        if was_delivered and items_data is not None:
            old_items_snapshot = list(
                instance.items.values("product_id", "quantity")
            )
        instance = super().update(instance, validated_data)

        if items_data is not None:
            # 1. Pre-process to handle already-validated Product objects
            for item in items_data:
                if isinstance(item.get("product_id"), Product):
                    item["product_id"] = item["product_id"].pk

            # 2. Delete items not in request
            incoming_ids = [item.get("id") for item in items_data if item.get("id")]
            instance.items.exclude(id__in=incoming_ids).delete()

            # 3. Update or Create items in one loop
            for item_data in items_data:
                item_id = item_data.get("id")
                if item_id:
                    # Update
                    item_instance = instance.items.filter(id=item_id).first()
                    if item_instance:
                        item_serializer = PurchaseOrderItemSerializer(instance=item_instance, data=item_data, context=self.context)
                        item_serializer.is_valid(raise_exception=True)
                        item_serializer.save()
                else:
                    # Create
                    item_serializer = PurchaseOrderItemSerializer(data=item_data, context={**self.context, "purchase_order": instance})
                    item_serializer.is_valid(raise_exception=True)
                    item_serializer.save()

            # 4. Final steps
            instance.total_amount = sum(item.subtotal for item in instance.items.all())
            instance.save(update_fields=["total_amount"])

            if was_delivered:
                instance.status = OrderStatus.PENDING
                instance.save(update_fields=["status"])
                self._update_delivered_order_inventory(instance, old_items_snapshot, old_branch)

        # Triggers
        if instance.status != old_status:
            from apps.supplier.tasks.purchase_order_tasks import synchronize_purchase_order_status_update_to_supplier_task
            transaction.on_commit(lambda: synchronize_purchase_order_status_update_to_supplier_task.delay(instance.id))

        if items_data is not None:
            from apps.supplier.tasks.purchase_order_tasks import synchronize_purchase_order_items_update_to_supplier_task
            transaction.on_commit(lambda: synchronize_purchase_order_items_update_to_supplier_task.delay(instance.id))

        return instance


    def _update_delivered_order_inventory(self, purchase_order, old_items, old_branch):
        resync_order_inventory(
            order=purchase_order,
            old_items=old_items,
            old_branch=old_branch,
            action_on_reversal=InventoryTransaction.Action.OUT,
            action_on_new=InventoryTransaction.Action.IN,
            description_prefix="PO",
            context_request=self.context.get("request")
        )