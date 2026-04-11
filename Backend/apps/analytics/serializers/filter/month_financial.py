from rest_framework import serializers

class MonthlySummaryMonthYearFilterSerializer(serializers.Serializer):
    month = serializers.IntegerField(min_value=1, max_value=12,required=False)
    year = serializers.IntegerField(min_value=2000,required=False)
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")

class MonthlySummaryDateRangeFilterSerializer(serializers.Serializer):
    start_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    start_year = serializers.IntegerField(min_value=2000, required=False)
    end_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    end_year = serializers.IntegerField(min_value=2000, required=False)
    year = serializers.IntegerField(min_value=2000, required=False)
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")

    def validate(self, data):
        start_month = data.get("start_month")
        start_year = data.get("start_year")
        end_month = data.get("end_month")
        end_year = data.get("end_year")

        if start_month and start_year and end_month and end_year:
            if start_year > end_year:
                 raise serializers.ValidationError("Start year must be less than or equal to end year.")
            if start_year == end_year and start_month > end_month:
                raise serializers.ValidationError("Start month must be less than or equal to end month in the same year.")
        
        return data

class MonthlySummaryYearFilterSerializer(serializers.Serializer):
    year = serializers.IntegerField(min_value=2000, required=False)
