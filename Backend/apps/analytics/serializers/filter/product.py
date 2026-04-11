from rest_framework import serializers
from apps.analytics.serializers.filter.base import BranchFilterSerializer, DateTimeRangeSerializer

class ProductFilterSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False)

class ProductPerformanceMonthYearFilterSerializer(BranchFilterSerializer):
    product_id = serializers.IntegerField(required=False)
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)

    def validate(self, data):
        if data.get("from_date") and data.get("to_date"):
            if data["from_date"] > data["to_date"]:
                raise serializers.ValidationError(
                    {"date_range": "from_date must be <= to_date"}
                )
        return data

class ProductStockFilterSerializer(ProductFilterSerializer, BranchFilterSerializer):
    pass

class ProductPerformanceFilterSerializer(DateTimeRangeSerializer, ProductFilterSerializer, BranchFilterSerializer):
    pass
