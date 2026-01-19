from rest_framework import serializers
from apps.product_category.serializers import ProductCategoryReadSerializer
from apps.product.models import Product


class ProductReadSerializer(serializers.ModelSerializer):
    product_category=ProductCategoryReadSerializer(read_only=True)
    class Meta:
        model = Product
        fields=["id","name","base_price","cost_price","description","product_category","sku","input_gst_rate","output_gst_rate","net_profit","created_at","updated_at"]


class ProductReadInventorySerializer(serializers.ModelSerializer):
    product_category=ProductCategoryReadSerializer(read_only=True)
    class Meta:
        model = Product
        fields=["id","name","product_category","sku",]
        