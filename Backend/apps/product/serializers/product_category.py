from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.product.models import ProductCategory


class ProductCategorySerializer(BaseSerializer):
    class Meta:
        model = ProductCategory
        fields = BaseSerializer.Meta.fields + [
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields

    def validate_name(self, value):
        user = self.context['request'].user

        if ProductCategory.objects.filter(
            business_id=user.business_id,
            name=value
        ).exists():
            raise serializers.ValidationError("Name already exists")

        return value

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data["business"] = user.business
        return super().create(validated_data)
