from rest_framework import serializers
from apps.product_category.models import ProductCategory

class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_name(self,value):
        user=self.context['request'].user

        if ProductCategory.objects.filter(business_id=user.business_id,name=value).exists():
            raise serializers.ValidationError("Name already exists")

        return value


class ProductCategoryReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = [
            "id",
            "name",
            "description"
        ]

