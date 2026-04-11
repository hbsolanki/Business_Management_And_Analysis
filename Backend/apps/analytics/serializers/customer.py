from rest_framework import serializers


class CustomerRevenueLeaderboardSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    customer_name = serializers.CharField()
    customer_mobile_number = serializers.CharField()

    total_revenue = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    order_count = serializers.IntegerField()
    avg_order_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    first_order_at = serializers.DateTimeField()
    last_order_at = serializers.DateTimeField()


class CustomerRetentionAnalyticsSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    new_customers = serializers.IntegerField()
    returning_customers = serializers.IntegerField()

    retention_rate = serializers.FloatField()
    churn_rate = serializers.FloatField()




class CustomerProductPreferenceSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    customer_name = serializers.CharField()

    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_category=serializers.CharField()

    quantity = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)

class CustomerProductItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(source="p_id")
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class CustomerProductNestedSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    customer_name = serializers.CharField()
    mobile_number = serializers.CharField()
    products = CustomerProductItemSerializer(many=True)


class CustomerSpendSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(source="c_id")
    customer_name = serializers.CharField()
    mobile_number = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
