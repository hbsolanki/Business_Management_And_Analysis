from rest_framework import serializers
from apps.inventory.models import InventoryProduct
from apps.product.models import Product

class ProductDetailsSerializer(serializers.ModelSerializer):
    product_category = serializers.CharField(source="product_category.name", read_only=True)
    class Meta:
        model = Product
        fields=["name","cost_price","base_price","net_profit","product_category"]



class ProductStockSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="product.name", read_only=True)
    product_category = serializers.CharField(source="product.product_category.name", read_only=True)
    branch = serializers.IntegerField(source="inventory.branch_id", read_only=True)

    class Meta:
        model = InventoryProduct
        fields = ["id", "name","product_category", "stock_quantity","branch"]


class ProductSellingSerializer(serializers.ModelSerializer):
    pass



class ProductPerformanceItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    category_name = serializers.CharField()

    total_quantity_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2)


class ProductPerformanceSummarySerializer(serializers.Serializer):
    total_quantity_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2)


class BranchProductPerformanceSerializer(serializers.Serializer):
    branch_id = serializers.IntegerField()
    summary = ProductPerformanceSummarySerializer()
    general_summary = ProductPerformanceSummarySerializer(required=False, allow_null=True)
    products = ProductPerformanceItemSerializer(many=True)


class ProductPerformanceReportSerializer(serializers.Serializer):
    summary = ProductPerformanceSummarySerializer()
    branch = BranchProductPerformanceSerializer(many=True)


class CategoryPerformanceSerializer(serializers.Serializer):
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_quantity_sold = serializers.IntegerField()
    product_count = serializers.IntegerField()


class TopSellingProductsSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    category_name = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_quantity_sold = serializers.IntegerField()

class ProductStockFilterSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False)
    branch = serializers.IntegerField(required=False)

class ProductPerformanceFilterSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False)
    from_date_and_time = serializers.DateTimeField(required=False)
    to_date_and_time = serializers.DateTimeField(required=False)
    branch = serializers.IntegerField(required=False)
