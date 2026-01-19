from rest_framework import serializers
from apps.product.models import Product

class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["name","base_price","cost_price","description","product_category","sku","input_gst_rate","output_gst_rate"]

    def validate_sku(self,value):

        if Product.objects.filter(sku=value).exists():
            return value

        return value