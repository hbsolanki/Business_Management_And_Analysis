from rest_framework import serializers
from apps.cost.models import MonthlyFinancialSummary
from apps.cost.models import MonthlyCostCategory

class CostCategoryBreakdownSerializer(serializers.ModelSerializer):
    category_name= serializers.CharField(source='cost_category.name',read_only=True)

    class Meta:
        model = MonthlyCostCategory
        fields=["category_name",'cost']

class MonthFinancialBreakdownSerializer(serializers.ModelSerializer):
    cost_category_items = CostCategoryBreakdownSerializer(many=True, read_only=True)
    
    class Meta:
        model = MonthlyFinancialSummary
        fields = [
            'year', 'month', 'total_revenue', 'cost_of_goods_sold', 
            'gross_profit', 'operating_expenses', 'salary_expenses', 
            'total_expenses', 'net_profit_before_tax', 'invoice_count',
            'input_gst', 'output_gst', 'gst_payable', 'cost_category_items'
        ]


class MonthNetProfitSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyFinancialSummary
        fields=['month','year','net_profit_before_tax']

class FinancialTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyFinancialSummary
        fields = ['month', 'year', 'total_revenue', 'total_expenses', 'net_profit_before_tax', 'gross_profit']

class TaxAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyFinancialSummary
        fields = ['month', 'year', 'input_gst', 'output_gst', 'gst_payable']

class ProfitMarginSerializer(serializers.ModelSerializer):
    net_profit_margin = serializers.SerializerMethodField()
    gross_profit_margin = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyFinancialSummary
        fields = ['month', 'year', 'total_revenue', 'net_profit_before_tax', 'net_profit_margin', 'gross_profit_margin']

    def get_net_profit_margin(self, obj):
        if obj.total_revenue and obj.total_revenue > 0:
            return round((obj.net_profit_before_tax / obj.total_revenue) * 100, 2)
        return 0.0

    def get_gross_profit_margin(self, obj):
        if obj.total_revenue and obj.total_revenue > 0:
            return round((obj.gross_profit / obj.total_revenue) * 100, 2)
        return 0.0
