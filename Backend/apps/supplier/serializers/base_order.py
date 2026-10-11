from decimal import Decimal
from rest_framework import serializers

from apps.base.serializers.gst import GSTSerializer
from apps.supplier.models import OrderStatus

from apps.base.serializers.base import BaseSerializer
from apps.product.models import Product
from apps.product.serializers.product import ProductSerializer

class BaseOrderItemSerializer(BaseSerializer):
    id = serializers.IntegerField(required=False)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True), write_only=True
    )
    product = ProductSerializer(read_only=True)
    gst = GSTSerializer(read_only=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, write_only=True, required=False)

    class Meta:
        fields = [
            "id", "product_id", "product", "quantity", "price", 
            "subtotal", "gst", "tax_rate"
        ]
        read_only_fields = ["subtotal", "product", "gst"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be > 0")
        return value

    def validate_product_id(self, value):
        business = self.context.get("business")
        if business and value.business != business:
            raise serializers.ValidationError("Product does not belong to your business.")
        return value


class BaseOrderSerializer(BaseSerializer):

    def validate_status(self, value):
        if self.instance:
            if self.instance.status == OrderStatus.FAILED:
                raise serializers.ValidationError("Failed orders cannot be updated.")
            if self.instance.status == OrderStatus.DELIVERED and value == OrderStatus.CANCELLED:
                raise serializers.ValidationError("Delivered orders cannot be cancelled.")
            if self.instance.status == OrderStatus.CANCELLED and value == OrderStatus.DELIVERED:
                raise serializers.ValidationError("Cancelled orders cannot be delivered.")
        return value

