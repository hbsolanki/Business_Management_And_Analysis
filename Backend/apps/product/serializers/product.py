from rest_framework import serializers
from apps.inventory.models import InventoryProduct
from django.db.models import Sum

from apps.base.serializers.base import BaseSerializer
from apps.base.models import BaseModel
from apps.inventory.models import Inventory
from apps.product.models import Product, ProductCategory
from apps.product.serializers.product_category import ProductCategorySerializer
from apps.employee.models import UserRole

class ProductSerializer(BaseSerializer):
    product_category = ProductCategorySerializer(read_only=True)
    product_category_id = serializers.IntegerField(write_only=True, required=False)
    stock_quantity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = BaseSerializer.Meta.fields + [
            "name", "base_price", "cost_price", "description", 
            "product_category", "product_category_id", "sku", 
            "input_gst_rate", "output_gst_rate",
            "stock_quantity", "net_profit", "low_stock_limit"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["stock_quantity", "net_profit"]

    def validate_sku(self, value):
        request = self.context.get("request")
        qs = Product.objects.filter(sku=value, business=request.user.business)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Product SKU already exists in your business.")
        return value

    def get_stock_quantity(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        user = request.user
        branch_id = request.query_params.get('branch')
        if user.role_name == UserRole.OWNER:
            if branch_id:
                inventories = Inventory.objects.filter(business=user.business, branch_id=branch_id)
            else:
                inventories = Inventory.objects.filter(business=user.business)
        else:
            assigned_branches = user.branches
            if branch_id:
                if assigned_branches.filter(id=branch_id).exists():
                    inventories = Inventory.objects.filter(business=user.business, branch_id=branch_id)
                else:
                    return 0
            else:
                inventories = Inventory.objects.filter(business=user.business, branch__in=assigned_branches)
        total_stock = InventoryProduct.objects.filter(
            inventory__in=inventories,
            product=obj
        ).aggregate(total=Sum('stock_quantity'))['total'] or 0
        return total_stock

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["business"] = request.user.business
        
        category_id = validated_data.pop("product_category_id", None)
        if category_id:
            try:
                validated_data["product_category"] = ProductCategory.objects.get(id=category_id, business=request.user.business)
            except ProductCategory.DoesNotExist:
                raise serializers.ValidationError({"product_category_id": "Category not found in your business."})
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        category_id = validated_data.pop("product_category_id", None)
        if category_id:
            try:
                instance.product_category = ProductCategory.objects.get(id=category_id, business=instance.business)
            except ProductCategory.DoesNotExist:
                raise serializers.ValidationError({"product_category_id": "Category not found."})
                
        return super().update(instance, validated_data)
