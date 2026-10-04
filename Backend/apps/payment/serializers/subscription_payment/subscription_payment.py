from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.payment.models import Payment, SubscriptionPayment
from apps.payment.serializers.payment.payment import PaymentSerializer
from apps.subscription.models import Subscription
from apps.subscription.serializers.subscription import SubscriptionSerializer


class SubscriptionPaymentSerializer(BaseSerializer):

    payment_id = serializers.PrimaryKeyRelatedField(
        queryset=Payment.objects.all(),
        source="payment",
        write_only=True,
    )
    subscription_id = serializers.PrimaryKeyRelatedField(
        queryset=Subscription.objects.all(),
        source="subscription",
        write_only=True,
    )

    payment = PaymentSerializer(read_only=True)
    subscription = SubscriptionSerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = SubscriptionPayment
        fields = BaseSerializer.Meta.fields + ["payment", "subscription", "payment_id", "subscription_id"]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["payment", "subscription"]

    def validate(self, attrs):
        attrs = super().validate(attrs)

        payment = attrs.get("payment")

        if payment and getattr(payment, "subscription_payment", None):
            if self.instance is None or payment.subscription_payment.pk != self.instance.pk:
                raise serializers.ValidationError({
                    "payment": "This payment is already linked to a subscription payment."
                })

        return attrs

    def create(self, validated_data):
        return SubscriptionPayment.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

