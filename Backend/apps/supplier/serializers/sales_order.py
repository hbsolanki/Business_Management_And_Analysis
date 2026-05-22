from django.db import transaction
from rest_framework import serializers, exceptions
from apps.base.models import GST

from apps.base.serializers.base import BaseSerializer
from apps.business.models import Branch, BusinessCustomer
from apps.business.serializers.customer import BusinessCustomerSerializer
from apps.inventory.models import InventoryTransaction
from apps.product.models import Product
from apps.product.serializers.product import ProductSerializer
from apps.supplier.models import OrderStatus, PurchaseOrder, SalesOrder, SalesOrderItem
from apps.supplier.utils import resync_order_inventory
from apps.business.serializers.branch import BranchSerializer
from apps.employee.models import UserRole


class SalesOrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    sku = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = SalesOrderItem
        fields = [
            "id", "sku", "product", "quantity", "unit_price", 
            "subtotal", "tax_rate", "tax_amount", "cgst_amount", "sgst_amount", "igst_amount"
        ]
        read_only_fields = [
            "id", "product", "subtotal", "tax_rate", 
            "tax_amount", "cgst_amount", "sgst_amount", "igst_amount"
        ]

    def validate(self, attrs):
        sku = attrs.get("sku")
        
        if not sku and not self.instance:
            raise serializers.ValidationError({"sku": "SKU required for new items."})

        business = self.context.get("business")
        if not business:
            raise serializers.ValidationError("Business context missing.")

        if sku:
            try:
                attrs["product"] = Product.objects.get(sku=sku, business=business, is_active=True)
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError({"sku": f"SKU {sku} not found."}) from exc

        return attrs

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be > 0")
        return value

    def create(self, validated_data):
        from apps.base.utils.tax import TaxCalculator
        validated_data.pop('sku', None)
        sales_order = self.context.get('sales_order')
        product = validated_data["product"]
        quantity = validated_data["quantity"]
        unit_price = validated_data["unit_price"]
        
        tax_rate = product.output_gst_rate
        base_amount = unit_price * quantity
        
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

        return SalesOrderItem.objects.create(
            sales_order=sales_order,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            gst=gst_obj
        )

    def update(self, instance, validated_data):
        from apps.base.utils.tax import TaxCalculator
        validated_data.pop('sku', None)
        
        instance.quantity = validated_data.get('quantity', instance.quantity)
        instance.unit_price = validated_data.get('unit_price', instance.unit_price)
        if "product" in validated_data:
            instance.product = validated_data["product"]
        
        tax_rate = instance.product.output_gst_rate
        base_amount = instance.unit_price * instance.quantity
        
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


class SalesOrderSerializer(BaseSerializer):
    items = SalesOrderItemSerializer(many=True, required=True)
    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), write_only=True, required=False)
    customer_id = serializers.PrimaryKeyRelatedField(queryset=BusinessCustomer.objects.all(), write_only=True, required=True)
    customer = BusinessCustomerSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)
    purchase_order = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta(BaseSerializer.Meta):
        model = SalesOrder
        fields = BaseSerializer.Meta.fields + [
            "customer_id",
            "branch_id",
            "status",
            "notes",
            "items",
            "customer",
            "branch",
            "purchase_order",
            "order_date",
            "total_amount",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "order_date",
            "total_amount",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Seed the business context for nested serializers
        self.context["business"] = self.get_business_context()

    def get_business_context(self):
        """Helper to resolve the business context from request or context."""
        request = self.context.get("request")
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            return request.user.business
        return self.context.get("business")

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least one item.")
        
        # Check for duplicate SKUs in the request
        skus = [item.get("sku") for item in value if item.get("sku")]
        if len(skus) != len(set(skus)):
            raise serializers.ValidationError("Each product (SKU) can only be added once per order. Please update the quantity for duplicate items.")
            
        return value

    def validate_branch_id(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        business = self.context.get("business")

        if business and value and value.business != business:
            raise serializers.ValidationError("Branch access denied.")

        if user and request.user.role_name != UserRole.OWNER:
            if not request.user.branches.filter(id=value.id).exists():
                raise exceptions.PermissionDenied("Branch access denied.")
        return value

    def validate_customer_id(self, value):
        business = self.context.get("business")
        if business and value.business != business:
            raise serializers.ValidationError("Customer ID invalid.")
        return value

    def _calculate_total_amount(self, items):
        return sum(item.quantity * item.unit_price for item in items)

    def validate_status(self, value):
        if self.instance:
            if self.instance.status == OrderStatus.FAILED:
                raise serializers.ValidationError("Failed orders cannot be updated.")
            if self.instance.status == OrderStatus.DELIVERED and value == OrderStatus.CANCELLED:
                raise serializers.ValidationError("Delivered orders cannot be cancelled.")
            if self.instance.status == OrderStatus.CANCELLED and value == OrderStatus.DELIVERED:
                raise serializers.ValidationError("Cancelled orders cannot be delivered.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        
        # Map IDs to model fields
        if "branch_id" in validated_data:
            validated_data["branch"] = validated_data.pop("branch_id")
        if "customer_id" in validated_data:
            validated_data["customer"] = validated_data.pop("customer_id")

        business = self.context.get("business")
        sales_order = SalesOrder.objects.create(
            business=business,
            **validated_data
        )

        # Save items using loop + serializer
        for item_data in items_data:
            item_serializer = SalesOrderItemSerializer(
                data=item_data,
                context={**self.context, "sales_order": sales_order}
            )
            item_serializer.is_valid(raise_exception=True)
            item_serializer.save()

        # Recalculate total
        total_amount_val = self._calculate_total_amount(sales_order.items.all())
        sales_order.total_amount = total_amount_val
        sales_order.save(update_fields=["total_amount"])

        # Trigger synchronization
        from apps.supplier.tasks.sales_order_tasks import synchronize_sales_order_to_customer_task
        transaction.on_commit(lambda: synchronize_sales_order_to_customer_task.delay(sales_order.pk))

        return sales_order

    @transaction.atomic
    def update(self, instance, validated_data):
        # Resolve business early to ensure it's in context for items
        business = self.get_business_context() or instance.business
        self.context["business"] = business
        
        items_data = validated_data.pop("items", None)

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
                if isinstance(item.get("product"), Product):
                    item["sku"] = item["product"].sku

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
                        item_serializer = SalesOrderItemSerializer(instance=item_instance, data=item_data, context=self.context)
                        item_serializer.is_valid(raise_exception=True)
                        item_serializer.save()
                else:
                    # Create
                    item_serializer = SalesOrderItemSerializer(data=item_data, context={**self.context, "sales_order": instance})
                    item_serializer.is_valid(raise_exception=True)
                    item_serializer.save()

            # 4. Final steps
            total_amount_val = self._calculate_total_amount(instance.items.all())
            instance.total_amount = total_amount_val
            instance.save(update_fields=["total_amount"])

            if was_delivered:
                instance.status = OrderStatus.PENDING
                instance.save(update_fields=["status"])
                self._update_delivered_order_inventory(instance, old_items_snapshot, old_branch)

        # Sync Triggers
        if instance.status != old_status:
            from apps.supplier.tasks.sales_order_tasks import synchronize_purchase_order_status_update_to_customer_task
            transaction.on_commit(lambda: synchronize_purchase_order_status_update_to_customer_task.delay(instance.pk))

        if items_data is not None:
            from apps.supplier.tasks.sales_order_tasks import synchronize_sales_order_items_update_to_customer_task
            transaction.on_commit(lambda: synchronize_sales_order_items_update_to_customer_task.delay(instance.pk))

        return instance


    def _update_delivered_order_inventory(self, sales_order, old_items, old_branch):
        resync_order_inventory(
            order=sales_order,
            old_items=old_items,
            old_branch=old_branch,
            action_on_reversal=InventoryTransaction.Action.IN,
            action_on_new=InventoryTransaction.Action.OUT,
            description_prefix="SO",
            context_request=self.context.get("request")
        )
