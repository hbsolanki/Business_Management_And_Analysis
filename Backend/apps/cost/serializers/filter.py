from rest_framework import serializers


class CostCategoryFilterSerializer(serializers.Serializer):
    pass


class MonthlyCostCategoryFilterSerializer(serializers.Serializer):
    month = serializers.IntegerField(required=False, min_value=1, max_value=12, help_text="Filter by month (1-12)")
    year = serializers.IntegerField(required=False, min_value=2000, help_text="Filter by year")
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")

class CostMonthFilterSerializer(serializers.Serializer):
    from_date = serializers.DateField(required=False, help_text="Filter by start date (YYYY-MM-DD)")
    to_date = serializers.DateField(required=False, help_text="Filter by end date (YYYY-MM-DD)")
    month = serializers.IntegerField(required=False, min_value=1, max_value=12, help_text="Filter by month (1-12)")
    year = serializers.IntegerField(required=False, min_value=2000, help_text="Filter by year")
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")

    def validate(self, data):
        from_date = data.get("from_date")
        to_date = data.get("to_date")
        if from_date and to_date and from_date > to_date:
            raise serializers.ValidationError("from_date must be less than or equal to to_date")
        return data
