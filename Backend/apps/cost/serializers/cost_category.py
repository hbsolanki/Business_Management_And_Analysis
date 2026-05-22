from rest_framework import serializers
from apps.cost.models import CostCategory


class CostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCategory
        fields = ["id", "name", "description", "gst_rate", "business"]
        read_only_fields = ["id", "business"]

    def validate_name(self, value):
        request = self.context["request"]
        user = request.user
        qs = CostCategory.objects.filter(business=request.user.business, name=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Cost category with this name already exists.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        validated_data["business"] = request.user.business
        return super().create(validated_data)
