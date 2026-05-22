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
        # Climb up to the absolute root serializer to retrieve root context
        parent = getattr(self, 'parent', None)
        root = parent
        while parent is not None:
            root = parent
            parent = getattr(parent, 'parent', None)
            
        context = root.context if root else self.context
        inventory = context.get('inventory')
        action = context.get('action')
        
        # Fallbacks for updates (where action or inventory are already in instance)
        if not action and root and getattr(root, 'instance', None):
            action = root.instance.action
        if not inventory and root and getattr(root, 'instance', None):
            inventory = root.instance.inventory

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

    def _get_inventory(self, user, branch_id):
        if not user or not branch_id:
            return None
        
        try:
            branch_id = int(branch_id)
        except (ValueError, TypeError):
            return None

        from apps.employee.models import UserRole, WorkType
        from apps.business.models import Branch

        # 1. First, check if the branch actually belongs to the user's business
        try:
            branch = Branch.objects.get(id=branch_id, business=user.business, is_active=True)
        except Branch.DoesNotExist:
            return None

        # 2. Check Role-based permissions to see if they can access this branch
        has_permission = False
        if user.is_superuser or user.role_name == UserRole.OWNER:
            has_permission = True
        elif user.role_name == UserRole.MANAGER:
            if user.branches.filter(id=branch_id).exists():
                has_permission = True
        elif user.role_name == UserRole.EMPLOYEE:
            if user.branch_works.filter(branch_id=branch_id, work_type=WorkType.INVENTORY).exists():
                has_permission = True

        if not has_permission:
            return None

        # 3. Get or create the Inventory record dynamically
        inventory, _ = Inventory.objects.get_or_create(
            branch=branch,
            defaults={"business": user.business}
        )
        return inventory

    def to_internal_value(self, data):
        # Inject action into context so nested items can validate stock if action is 'OUT'
        if 'action' in data:
            self.context['action'] = data.get('action')
        
        # Inject inventory into context if not already present
        if 'inventory' not in self.context:
            request = self.context.get('request')
            branch_id = data.get('branch_id') or data.get('branch')
            if request and request.user and branch_id:
                inventory = self._get_inventory(request.user, branch_id)
                if inventory:
                    self.context['inventory'] = inventory
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
