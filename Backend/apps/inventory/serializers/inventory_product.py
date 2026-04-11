from rest_framework import serializers
from apps.inventory.models import InventoryProduct
from apps.product.serializers.product_category import ProductCategorySerializer
from apps.product.models import Product

class InventoryProductItemsSerializer(serializers.ModelSerializer):
    product_category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "product_category", "sku", ]
        read_only_fields = fields

class InventoryProductSerializer(serializers.ModelSerializer):
    product = InventoryProductItemsSerializer(read_only=True)
    branch_name = serializers.CharField(source="inventory.branch.name", read_only=True)
    branch_id = serializers.IntegerField(source="inventory.branch.id", read_only=True)

    class Meta:
        model = InventoryProduct
        fields = ["id", "product", "stock_quantity", "branch_name", "branch_id"]
        read_only_fields = fields
