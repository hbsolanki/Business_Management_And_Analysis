from rest_framework import serializers
from apps.cost.models import MonthlyFinancialSummary, MonthlyProductPerformance
from apps.cost.serializers.cost_category_month import MonthlyCostCategorySerializer


class MonthlyProductPerformanceDetailsSerializer(serializers.ModelSerializer):
    product_name=serializers.CharField(source="product.name")
    product_sku=serializers.CharField(source="product.sku")
    product_category_name=serializers.CharField(source="product.product_category.name")
    product_id=serializers.IntegerField(source="product.id")
    class Meta:
        model = MonthlyProductPerformance
        fields = ["id","product_name","product_sku","cost","product_category_name","revenue","product_id","quantity"]


class MonthlyFinancialSummaryDetailSerializer(serializers.ModelSerializer):
    product_performance=MonthlyProductPerformanceDetailsSerializer(many=True,read_only=True)
    cost_category_items=MonthlyCostCategorySerializer(many=True,read_only=True)
    class Meta:
        model = MonthlyFinancialSummary
        fields = [
            "id",
            "year",
            "month",
            "branch",
            "total_revenue",
            "cost_of_goods_sold",
            "total_expenses",
            "gross_profit",
            "net_profit_before_tax",
            "operating_expenses",
            "salary_expenses",
            "input_gst",
            "output_gst",
            "gst_payable",
            "invoice_count",
            "product_performance",
            'cost_category_items'
        ]
        read_only_fields = fields
