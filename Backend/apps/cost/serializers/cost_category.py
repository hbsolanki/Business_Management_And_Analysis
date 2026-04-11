from rest_framework import serializers
from apps.cost.models import CostCategory


class CostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCategory
        fields = ["id", "name", "description", "business"]
        read_only_fields = ["id", "business"]

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["business"] = user.business
        return super().create(validated_data)
