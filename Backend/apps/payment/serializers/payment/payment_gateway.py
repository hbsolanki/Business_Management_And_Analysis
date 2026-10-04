from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.payment.models import Payment, PaymentGatewayDetail


class PaymentGatewaySerializer(BaseSerializer):
    """Public serializer — exposes only safe, non-sensitive gateway info."""

    payment_id = serializers.PrimaryKeyRelatedField(queryset=Payment.objects.all(), source="payment", write_only=True, required=True)
    stripe_payment_intent_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    stripe_connected_account_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    checkout_session_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    payment_link = serializers.URLField(required=False, allow_blank=True, allow_null=True, write_only=True)
    payment_link_expires_at = serializers.DateTimeField(required=False, allow_null=True, write_only=True)
    platform_fee = serializers.DecimalField(required=False, allow_null=True, max_digits=10, decimal_places=2)

    class Meta(BaseSerializer.Meta):
        model = PaymentGatewayDetail
        fields = BaseSerializer.Meta.fields + [
            "payment_id",
            "gateway",
            "stripe_payment_intent_id",
            "stripe_connected_account_id",
            "checkout_session_id",
            "payment_link",
            "payment_link_expires_at",
            "platform_fee",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields

    def validate_stripe_payment_intent_id(self, value):
        # Normalize empty string to None at field level
        if value == "":
            return None
        return value

    def validate_stripe_connected_account_id(self, value):
        # Normalize empty string to None at field level
        if value == "":
            return None
        return value

    def validate_payment_id(self, value):
        # `value` is a Payment instance (PrimaryKeyRelatedField -> source='payment')
        if value and getattr(value, "gateway_detail", None):
            if self.instance is None or value.gateway_detail.pk != self.instance.pk:
                raise serializers.ValidationError("This payment already has a gateway detail record.")
        return value

    def create(self, validated_data):
        return PaymentGatewayDetail.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance



