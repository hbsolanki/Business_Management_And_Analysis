from rest_framework import serializers
from rest_framework.validators import UniqueValidator

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

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["business"] = request.user.business
        return super().create(validated_data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and getattr(request, "user", None):
            # scope name uniqueness to current business
            name_validators = [
                v for v in self.fields["name"].validators if not isinstance(v, UniqueValidator)
            ]
            name_validators.append(
                UniqueValidator(
                    queryset=ProductCategory.objects.filter(business=request.user.business),
                    message="Name already exists",
                )
            )
            self.fields["name"].validators = name_validators
