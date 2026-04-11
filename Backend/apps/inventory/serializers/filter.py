from rest_framework import serializers

class InventoryProductFilterSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, help_text="Search by product name (icontains)")
    sku = serializers.CharField(required=False, help_text="Search by product SKU (icontains)")
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")

class InventoryTransactionFilterSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["IN", "OUT"], required=False, help_text="Filter by action (IN/OUT)")
    from_date = serializers.DateTimeField(required=False, help_text="Start date for transactions (gte)")
    to_date = serializers.DateTimeField(required=False, help_text="End date for transactions (lte)")
    product_name = serializers.CharField(required=False, help_text="Search by product name (icontains)")
    product_sku = serializers.CharField(required=False, help_text="Search by product SKU (icontains)")
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")
