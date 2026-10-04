from rest_framework import  serializers
from apps.payment.models import Payment
from apps.business.models import Business
from apps.payment.serializers.payment.payment_gateway import PaymentGatewaySerializer


from apps.base.serializers.base import BaseSerializer

class PaymentSerializer(BaseSerializer):
    business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(),
        source="business",
        write_only=True,
        required=False,
    )
    gateway_detail = PaymentGatewaySerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = Payment
        fields = BaseSerializer.Meta.fields + [
            "business_id",
            "payment_type",
            "method",
            "status",
            "amount", "currency", "refunded_amount",
            "reference_number",
            "paid_at", "failed_at", "refunded_at",
            "failure_reason", "notes",
            "gateway_detail",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "refunded_amount",
            "refunded_at",
            "gateway_detail",
        ]

