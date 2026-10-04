from rest_framework import serializers

class PaymentFilterSerializer(serializers.Serializer):
    status = serializers.CharField(required=False, help_text="Comma-separated payment status values.")
    method = serializers.CharField(required=False, help_text="Comma-separated payment method values.")
    from_date = serializers.DateTimeField(required=False, help_text="Filter payments created on or after this timestamp.")
    to_date = serializers.DateTimeField(required=False, help_text="Filter payments created on or before this timestamp.")
