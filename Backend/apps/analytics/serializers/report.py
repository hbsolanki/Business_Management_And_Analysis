from rest_framework import serializers

class ReportGenerateSerializer(serializers.Serializer):
    report_type = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                "product",
                "inventory",
                "transaction",
                "cost",
                "purchase_order",
            ]
        ),
        required=False
    )

    product_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    branch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)

