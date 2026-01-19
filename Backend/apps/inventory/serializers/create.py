from rest_framework import serializers

class InventoryProductCreateSerializer(serializers.Serializer):
    productId=serializers.IntegerField()
    stock_quantity=serializers.IntegerField()

class InventoryTransItemCreateSerializer(serializers.Serializer):
    productId = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(min_value=1,required=True)

class InventoryTransCreateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["IN", "OUT"])
    description = serializers.CharField(required=True)
    items = InventoryTransItemCreateSerializer(many=True)

    def validate_item(self, items):
        if not items:
            raise serializers.ValidationError("At least one item is required")

        return items
