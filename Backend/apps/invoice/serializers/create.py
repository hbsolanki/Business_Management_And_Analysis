from rest_framework import serializers

class ProductInvoiceCreateSerializer(serializers.Serializer):
    productId = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class InvoiceCreateSerializer(serializers.Serializer):
    items = ProductInvoiceCreateSerializer(many=True)

    payment_mode = serializers.ChoiceField(
        choices=[("CASH", "Cash"), ("ONLINE", "Online")]
    )

    # customer details
    name = serializers.CharField(max_length=100)
    mobile_number = serializers.CharField(max_length=10)

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    address = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    age = serializers.IntegerField(min_value=0)

    gender = serializers.ChoiceField(
        choices=[("male", "male"), ("female", "female")]
    )
