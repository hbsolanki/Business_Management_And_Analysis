from rest_framework import serializers


class BulkIdSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

    def validate_ids(self, value):
        return value
