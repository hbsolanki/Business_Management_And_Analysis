from django.db import transaction
from rest_framework import serializers, exceptions

from apps.base.serializers.base import BaseSerializer
from apps.business.models import Branch, BusinessCustomer
from apps.business.serializers.customer import BusinessCustomerSerializer
from apps.inventory.models import InventoryTransaction
from apps.product.models import Product
from apps.product.serializers.product import ProductSerializer
from apps.supplier.models import OrderStatus, SalesOrder, SalesOrderItem
from apps.supplier.utils import resync_order_inventory
from apps.business.serializers.branch import BranchSerializer
from apps.employee.models import UserRole


from apps.supplier.serializers.base_order import BaseOrderItemSerializer, BaseOrderSerializer
from apps.base.utils.tax import TaxCalculator
from apps.base.serializers.gst import GSTSerializer

class SalesOrderItemSerializer(BaseOrderItemSerializer):
    sku = serializers.CharField(write_only=True, required=False)

    class Meta(BaseOrderItemSerializer.Meta):
        model = SalesOrderItem
        fields = [f for f in BaseOrderItemSerializer.Meta.fields if f != "product_id"] + ["sku"]

    def validate(self, attrs):
        sku = attrs.get("sku")
        
        if not sku and not self.instance:
            raise serializers.ValidationError({"sku": "SKU required for new items."})

        business = self.context.get("business")
        if not business:
            raise serializers.ValidationError("Business context missing.")

        if sku:
            try:
                attrs["product_id"] = Product.objects.get(sku=sku, business=business, is_active=True)
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError({"sku": f"SKU {sku} not found."}) from exc

        return attrs

    def create(self, validated_data):
        product = validated_data.get("product_id")
        quantity = validated_data["quantity"]
        price = validated_data["price"]
        
        tax_rate = product.output_gst_rate
        base_amount = price * quantity
        
        tax_data = TaxCalculator.calculate_gst(base_amount, tax_rate)
        gst_data = {
            "gst_rate": tax_rate,
            "gst_amount": tax_data["tax_amount"],
            "cgst_amount": tax_data["cgst_amount"],
            "sgst_amount": tax_data["sgst_amount"],
            "igst_amount": tax_data["igst_amount"],
            "total_amount": tax_data["total_amount"]
        }
        gst_serializer = GSTSerializer(data=gst_data)
        gst_serializer.is_valid(raise_exception=True)
        gst_obj = gst_serializer.save()
        
        return SalesOrderItem.objects.create(
            product=product,
            gst=gst_obj,
            price=price,
            subtotal=base_amount,
            quantity=quantity,
            sales_order=self.context.get("sales_order")
        )

    def update(self, instance, validated_data):
        product = validated_data.pop("product_id", instance.product)
        quantity = validated_data.get("quantity", instance.quantity)
        price = validated_data.get("price", instance.price)
        
        instance.quantity = quantity
        instance.price = price
        instance.product = product
            
        tax_rate = product.output_gst_rate
        base_amount = price * quantity
        
        tax_data = TaxCalculator.calculate_gst(base_amount, tax_rate)
        gst_data = {
            "gst_rate": tax_rate,
            "gst_amount": tax_data["tax_amount"],
            "cgst_amount": tax_data["cgst_amount"],
            "sgst_amount": tax_data["sgst_amount"],
            "igst_amount": tax_data["igst_amount"],
            "total_amount": tax_data["total_amount"]
        }
        
        if instance.gst:
            gst_serializer = GSTSerializer(instance.gst, data=gst_data, partial=True)
            gst_serializer.is_valid(raise_exception=True)
            gst_serializer.save()
        else:
            gst_serializer = GSTSerializer(data=gst_data)
            gst_serializer.is_valid(raise_exception=True)
            instance.gst = gst_serializer.save()
            
        instance.subtotal = base_amount
        instance.save()
        return instance

class SalesOrderSerializer(BaseOrderSerializer):
    items = SalesOrderItemSerializer(many=True, required=True)
    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), write_only=True, required=False)
    customer_id = serializers.PrimaryKeyRelatedField(queryset=BusinessCustomer.objects.all(), write_only=True, required=True)
    customer = BusinessCustomerSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)

    from apps.base.serializers.gst import GSTSerializer
    gst = GSTSerializer(read_only=True)

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
            "order_date",
            "total_amount",
            "gst",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "order_date",
            "total_amount",
            "gst",
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

    # validate_branch_id handled by BaseOrderSerializerMixin

    def validate_customer_id(self, value):
        business = self.context.get("business")
        if business and value.business != business:
            raise serializers.ValidationError("Customer ID invalid.")
        return value

    # _calculate_total_amount and validate_status handled by BaseOrderSerializerMixin

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

        TaxCalculator.apply_order_totals(sales_order, sales_order.items.all())

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

            TaxCalculator.apply_order_totals(instance, instance.items.all())

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
