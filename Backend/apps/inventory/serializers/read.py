from rest_framework import serializers
from apps.product.serializers.product import  ProductReadInventorySerializer
from apps.inventory.models import InventoryTransaction, InventoryTransactionItem,Inventory,InventoryProduct

class InventoryTransItemSerializer(serializers.ModelSerializer):
    product = ProductReadInventorySerializer(read_only=True)

    class Meta:
        model = InventoryTransactionItem
        fields = ["id", "product", "quantity"]


class InventoryTransReadSerializer(serializers.ModelSerializer):
    items = InventoryTransItemSerializer(many=True, read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = ["id", "action", "description",  "items","created_at","created_by"]

class InventoryProductReadSerializer(serializers.ModelSerializer):
    product = ProductReadInventorySerializer(read_only=True)

    class Meta:
        model = InventoryProduct
        fields = ["id", "product", "stock_quantity"]

class InventoryReadSerializer(serializers.ModelSerializer):
    inventory_products = InventoryProductReadSerializer(
        many=True, read_only=True
    )
    inventory_transactions = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = ["id", "inventory_products", "inventory_transactions"]

    def get_inventory_transactions(self, obj):
        qs = (
            obj.inventory_transactions
            .all()
            .order_by("-created_at")
        )
        return InventoryTransReadSerializer(qs, many=True).data