from rest_framework import serializers
from apps.product.models import Product
from apps.product.serializers.product_category import ProductCategorySerializer

class ProductBaseSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = ["name","base_price","cost_price","description","product_category","sku","input_gst_rate","output_gst_rate"]


    def validate_sku(self, value):
        if Product.objects.filter(sku=value).exists():
            raise serializers.ValidationError("Product SKU already exists")

        return value


class ProductCreateSerializer(ProductBaseSerializer):
    pass


class ProductUpdateSerializer(ProductBaseSerializer):
    pass


class ProductReadSerializer(serializers.ModelSerializer):
    product_category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "base_price", "cost_price", "description", "product_category", "sku", "input_gst_rate",
                  "output_gst_rate", "net_profit", "created_at", "updated_at"]


class ProductReadInventorySerializer(serializers.ModelSerializer):
    product_category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "product_category", "sku", ]


