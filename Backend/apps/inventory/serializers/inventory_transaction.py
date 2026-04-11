from rest_framework import serializers
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.inventory.serializers.inventory_product import InventoryProductItemsSerializer
from apps.inventory.models import InventoryTransaction, InventoryTransactionItem, InventoryProduct, Inventory
from apps.product.models import Product
from apps.base.serializers.base import BaseSerializer

class InventoryTransactionItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(write_only=True)
    product = InventoryProductItemsSerializer(read_only=True)

    class Meta:
        model = InventoryTransactionItem
        fields = ["id", "product_id", "quantity", "product"]
        read_only_fields = ["id", "product"]

    def validate(self, attrs):
        inventory = self.context.get('inventory')
        action = self.context.get('action')
        product_id = attrs.get('product_id')
        quantity = attrs.get('quantity')

        if not inventory or not action:
             raise ValidationError("Context missing inventory or action.")

        try:
            # select_for_update for safety within the atomic transaction
            product_obj = Product.objects.get(id=product_id, business=inventory.business,is_active=True)
            inv_prod, created = InventoryProduct.objects.get_or_create(
                inventory=inventory,
                product=product_obj,
                defaults={'stock_quantity': 0}
            )
        except Product.DoesNotExist:
            raise ValidationError({"product_id": f"Product ID {product_id} not found in your business or product is inactive."})

        if action == InventoryTransaction.Action.OUT and quantity > inv_prod.stock_quantity:
            raise ValidationError({"quantity": f"Insufficient stock for {product_obj.name}. Available: {inv_prod.stock_quantity}"})

        attrs['inv_prod_instance'] = inv_prod
        return attrs

    def create(self, validated_data):
        transaction_obj = self.context.get('transaction')
        inv_prod_instance = validated_data.pop('inv_prod_instance')
        # Lock the row for update within the atomic transaction
        inv_prod = InventoryProduct.objects.select_for_update().get(id=inv_prod_instance.id)
        
        action = self.context.get('action')
        quantity = validated_data['quantity']

        # Update Stock
        if action == InventoryTransaction.Action.OUT:
            inv_prod.stock_quantity -= quantity
        else:
            inv_prod.stock_quantity += quantity
        inv_prod.save(update_fields=["stock_quantity"])

        return InventoryTransactionItem.objects.create(
            transaction=transaction_obj,
            product=inv_prod.product,
            **validated_data
        )

class InventoryTransactionSerializer(BaseSerializer):
    items = InventoryTransactionItemSerializer(many=True)
    branch_name = serializers.CharField(source="inventory.branch.name", read_only=True)
    branch = serializers.IntegerField(source="inventory.branch.id", read_only=True)
    branch_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = InventoryTransaction
        fields = ["id", "action", "description", "items", "created_at", "created_by", "branch", "branch_name", "branch_id", "purchase_order"]
        read_only_fields = ["id", "created_at", "created_by", "branch", "branch_name", "purchase_order"]

    def to_internal_value(self, data):
        # Inject action into context so nested items can validate stock if action is 'OUT'
        if 'action' in data:
            self.context['action'] = data.get('action')
        return super().to_internal_value(data)

    def validate_items(self, items):
        if not items:
            raise ValidationError("At least one item is required.")
        return items

    def validate(self, attrs):
        branch = getattr(self, "_validated_branch", None)
        inventory = self.context.get('inventory')

        if not branch and inventory:
            branch = inventory.branch

        if not branch:
             raise ValidationError({"branch_id": "branch_id is required."})
        
        if not inventory:
             raise ValidationError({"branch_id": "You do not have permission to perform inventory transactions on this branch."})
        
        attrs['inventory'] = inventory
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        inventory = validated_data.pop('inventory')
        validated_data.pop('branch_id', None)
        action = validated_data['action']
        request = self.context.get('request')
        # Safety: Background tasks or internal calls may not have a request object
        user = getattr(request, 'user', None) if request else None
        
        # 1. Create the Transaction record
        purchase_order = self.context.get('purchase_order')  # Optional purchase_order link
        transaction_obj = InventoryTransaction.objects.create(
            inventory=inventory,
            created_by=user,
            purchase_order=purchase_order,
            **validated_data
        )

        # 2. Save Items using many=True
        item_serializer = InventoryTransactionItemSerializer(
            data=items_data,
            many=True,
            context={
                'request': request,
                'inventory': inventory,
                'action': action,
                'transaction': transaction_obj
            }
        )
        item_serializer.is_valid(raise_exception=True)
        item_serializer.save()

        return transaction_obj
