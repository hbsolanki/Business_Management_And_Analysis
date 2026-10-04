from rest_framework import serializers
import logging

from apps.business.models import Business
from apps.payment.models import StripeConnectAccount
from apps.master.utils.text_choices import StripeAccountStatus

logger = logging.getLogger(__name__)


from apps.base.serializers.base import BaseSerializer

class StripeConnectAccountSerializer(BaseSerializer):
    can_accept_payments = serializers.BooleanField(read_only=True)

    business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(),
        source="business",
        write_only=True,
        required=False,
    )
    stripe_account_id = serializers.CharField(required=False, write_only=True)
    status = serializers.ChoiceField(choices=StripeAccountStatus.choices, required=False, write_only=True)
    onboarding_started_at = serializers.DateTimeField(required=False, allow_null=True, write_only=True)

    class Meta(BaseSerializer.Meta):
        model = StripeConnectAccount
        fields = BaseSerializer.Meta.fields + [
            "business_id",
            "stripe_account_id",
            "account_type",
            "status",
            "charges_enabled",
            "payouts_enabled",
            "details_submitted",
            "can_accept_payments",
            "onboarding_started_at",
            "onboarded_at",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "account_type",
            "status",
            "charges_enabled",
            "payouts_enabled",
            "details_submitted",
            "can_accept_payments",
            "onboarded_at",
        ]

    def create(self, validated_data):
        return StripeConnectAccount.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
