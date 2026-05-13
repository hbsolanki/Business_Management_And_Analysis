from django.db import transaction
from django.utils import timezone

from rest_framework import serializers, exceptions

from apps.base.models import GST
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


from decimal import Decimal

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True
    )
    product = ProductSerializer(read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id", "product_id", "product", "quantity", "unit_cost", 
            "subtotal", "tax_rate", "tax_amount", "cgst_amount", "sgst_amount", "igst_amount"
        ]
        read_only_fields = ["subtotal", "product", "tax_amount", "cgst_amount", "sgst_amount", "igst_amount"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be > 0")
        return value

    def create(self, validated_data):
        from apps.base.utils.tax import TaxCalculator
        purchase_order = self.context.get("purchase_order")
        product = validated_data["product_id"]
        quantity = validated_data["quantity"]
        unit_cost = validated_data["unit_cost"]
        
        tax_rate = validated_data.get("tax_rate", product.input_gst_rate)
        base_amount = unit_cost * quantity
        
        # Centralized calculation
        tax_data = TaxCalculator.calculate_gst(base_amount, tax_rate)

        # Create GST object
        gst_obj = GST.objects.create(
            gst_rate=tax_rate,
            gst_amount=tax_data["tax_amount"],
            cgst_amount=tax_data["cgst_amount"],
            sgst_amount=tax_data["sgst_amount"],
            igst_amount=tax_data["igst_amount"],
            total_amount=tax_data["total_amount"]
        )

        return PurchaseOrderItem.objects.create(
            purchase_order=purchase_order,
            product=product,
            quantity=quantity,
            unit_cost=unit_cost,
            gst=gst_obj
        )

    def update(self, instance, validated_data):
        from apps.base.utils.tax import TaxCalculator
        validated_data.pop("product_id", None)

        instance.quantity = validated_data.get("quantity", instance.quantity)
        instance.unit_cost = validated_data.get("unit_cost", instance.unit_cost)
        
        tax_rate = validated_data.get("tax_rate", instance.tax_rate)
        base_amount = instance.unit_cost * instance.quantity
        
        # Centralized calculation
        tax_data = TaxCalculator.calculate_gst(base_amount, tax_rate)
        
        if instance.gst:
            instance.gst.gst_rate = tax_rate
            instance.gst.gst_amount = tax_data["tax_amount"]
            instance.gst.cgst_amount = tax_data["cgst_amount"]
            instance.gst.sgst_amount = tax_data["sgst_amount"]
            instance.gst.igst_amount = tax_data["igst_amount"]
            instance.gst.total_amount = tax_data["total_amount"]
            instance.gst.save()
        else:
            instance.gst = GST.objects.create(
                gst_rate=tax_rate,
                gst_amount=tax_data["tax_amount"],
                cgst_amount=tax_data["cgst_amount"],
                sgst_amount=tax_data["sgst_amount"],
                igst_amount=tax_data["igst_amount"],
                total_amount=tax_data["total_amount"]
            )
        
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
            "total_tax",
            "cgst_total",
            "sgst_total",
            "igst_total",
            "received_at",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "order_date",
            "total_amount",
            "total_tax",
            "cgst_total",
            "sgst_total",
            "igst_total",
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
        
        # Check for duplicate products in the request
        product_ids = [item.get("product_id") for item in value if item.get("product_id")]
        # Handle cases where product_id might be a Product object (if already validated)
        product_ids = [pid.id if hasattr(pid, "id") else pid for pid in product_ids]
        
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Each product can only be added once per order. Please update the quantity for duplicate items.")
            
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

        item_serializer = PurchaseOrderItemSerializer(context={**self.context, "purchase_order": purchase_order})
        items = [item_serializer.create(item_data) for item_data in items_data]

        # Recalculate totals
        total_tax_val = sum(item.tax_amount for item in items)
        cgst_total_val = sum(item.cgst_amount for item in items)
        sgst_total_val = sum(item.sgst_amount for item in items)
        igst_total_val = sum(item.igst_amount for item in items)
        total_amount_val = sum(item.quantity * item.unit_cost for item in items) + total_tax_val
        
        # Create/Update GST for the entire order
        avg_gst_rate = ((total_tax_val / (total_amount_val - total_tax_val)) * Decimal("100")).quantize(Decimal("0.01")) if total_amount_val > total_tax_val else Decimal("0.00")
        
        if purchase_order.gst:
            purchase_order.gst.gst_rate = avg_gst_rate
            purchase_order.gst.gst_amount = total_tax_val
            purchase_order.gst.cgst_amount = cgst_total_val
            purchase_order.gst.sgst_amount = sgst_total_val
            purchase_order.gst.igst_amount = igst_total_val
            purchase_order.gst.total_amount = total_amount_val
            purchase_order.gst.save()
        else:
            purchase_order.gst = GST.objects.create(
                gst_rate=avg_gst_rate,
                gst_amount=total_tax_val,
                cgst_amount=cgst_total_val,
                sgst_amount=sgst_total_val,
                igst_amount=igst_total_val,
                total_amount=total_amount_val
            )
        
        purchase_order.total_amount = total_amount_val
        purchase_order.save(update_fields=["total_amount", "gst"])

        # Trigger GST summary update task if status is DELIVERED
        if purchase_order.status == OrderStatus.DELIVERED:
            try:
                from apps.gst_management.tasks import update_gst_summary_task
                update_gst_summary_task.delay(
                    business_id=purchase_order.business.id,
                    month=purchase_order.received_at.month if purchase_order.received_at else timezone.now().month,
                    year=purchase_order.received_at.year if purchase_order.received_at else timezone.now().year
                )
            except Exception as e:
                print(f"Error queueing GST summary task for PO: {e}")
        
        # Trigger synchronization
        from apps.supplier.tasks.purchase_order_tasks import synchronize_purchase_order_to_supplier_task
        transaction.on_commit(lambda: synchronize_purchase_order_to_supplier_task.delay(purchase_order.id))

        return purchase_order

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        if "branch_id" in validated_data:
            validated_data["branch"] = validated_data.pop("branch_id")
        if "supplier_id" in validated_data:
            validated_data["supplier"] = validated_data.pop("supplier_id")

        was_delivered = instance.status == OrderStatus.DELIVERED
        old_status = instance.status
        old_branch = instance.branch
        old_received_at = instance.received_at

        old_items_snapshot = None
        if was_delivered and items_data is not None:
            old_items_snapshot = list(instance.items.values("product_id", "quantity"))

        instance = super().update(instance, validated_data)

        if items_data is not None:
            # Pre-process
            for item in items_data:
                if isinstance(item.get("product_id"), Product):
                    item["product_id"] = item["product_id"].pk

            # Delete items not in request
            incoming_ids = [item.get("id") for item in items_data if item.get("id")]
            instance.items.exclude(id__in=incoming_ids).delete()

            # Update or Create
            for item_data in items_data:
                item_id = item_data.get("id")
                if item_id:
                    item_instance = instance.items.filter(id=item_id).first()
                    if item_instance:
                        item_serializer = PurchaseOrderItemSerializer(instance=item_instance, data=item_data, context=self.context)
                        item_serializer.is_valid(raise_exception=True)
                        item_serializer.save()
                else:
                    item_serializer = PurchaseOrderItemSerializer(data=item_data, context={**self.context, "purchase_order": instance})
                    item_serializer.is_valid(raise_exception=True)
                    item_serializer.save()

            # Finalize totals
            total_tax_val = sum(item.tax_amount for item in instance.items.all())
            cgst_total_val = sum(item.cgst_amount for item in instance.items.all())
            sgst_total_val = sum(item.sgst_amount for item in instance.items.all())
            igst_total_val = sum(item.igst_amount for item in instance.items.all())
            total_amount_val = sum(item.quantity * item.unit_cost for item in instance.items.all()) + total_tax_val
            
            avg_gst_rate = ((total_tax_val / (total_amount_val - total_tax_val)) * Decimal("100")).quantize(Decimal("0.01")) if total_amount_val > total_tax_val else Decimal("0.00")
            
            if instance.gst:
                instance.gst.gst_rate = avg_gst_rate
                instance.gst.gst_amount = total_tax_val
                instance.gst.cgst_amount = cgst_total_val
                instance.gst.sgst_amount = sgst_total_val
                instance.gst.igst_amount = igst_total_val
                instance.gst.total_amount = total_amount_val
                instance.gst.save()
            else:
                instance.gst = GST.objects.create(
                    gst_rate=avg_gst_rate,
                    gst_amount=total_tax_val,
                    cgst_amount=cgst_total_val,
                    sgst_amount=sgst_total_val,
                    igst_amount=igst_total_val,
                    total_amount=total_amount_val
                )
            
            instance.total_amount = total_amount_val
            instance.save(update_fields=["total_amount", "gst"])

            if was_delivered:
                instance.status = OrderStatus.PENDING
                instance.save(update_fields=["status"])
                self._update_delivered_order_inventory(instance, old_items_snapshot, old_branch)

        # Triggers for GST and Sync
        if instance.status != old_status:
            from apps.supplier.tasks.purchase_order_tasks import synchronize_purchase_order_status_update_to_supplier_task
            transaction.on_commit(lambda: synchronize_purchase_order_status_update_to_supplier_task.delay(instance.id))
            
        if instance.status == OrderStatus.DELIVERED:
            try:
                from apps.gst_management.tasks import update_gst_summary_task
                # Update current month
                transaction.on_commit(lambda: update_gst_summary_task.delay(
                    business_id=instance.business.id,
                    month=instance.received_at.month if instance.received_at else timezone.now().month,
                    year=instance.received_at.year if instance.received_at else timezone.now().year
                ))
                # Handle month change for delivered orders
                if was_delivered and instance.received_at and old_received_at:
                    if (old_received_at.month != instance.received_at.month or 
                        old_received_at.year != instance.received_at.year):
                        transaction.on_commit(lambda: update_gst_summary_task.delay(
                            business_id=instance.business.id,
                            month=old_received_at.month,
                            year=old_received_at.year
                        ))
            except Exception as e:
                print(f"Error queueing GST summary task for PO update: {e}")

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