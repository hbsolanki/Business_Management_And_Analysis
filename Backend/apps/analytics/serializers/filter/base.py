from rest_framework import serializers

class DateRangeSerializer(serializers.Serializer):
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)

    def validate(self, data):
        if data.get("from_date") and data.get("to_date"):
            if data["from_date"] > data["to_date"]:
                raise serializers.ValidationError(
                    {"date_range": "from_date must be <= to_date"}
                )
        return data

class DateTimeRangeSerializer(serializers.Serializer):
    from_date_and_time = serializers.DateTimeField(required=False)
    to_date_and_time = serializers.DateTimeField(required=False)

    def validate(self, data):
        if data.get("from_date_and_time") and data.get("to_date_and_time"):
            if data["from_date_and_time"] > data["to_date_and_time"]:
                raise serializers.ValidationError(
                    {"datetime_range": "from_date_and_time must be <= to_date_and_time"}
                )
        return data

class BranchFilterSerializer(serializers.Serializer):
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")
