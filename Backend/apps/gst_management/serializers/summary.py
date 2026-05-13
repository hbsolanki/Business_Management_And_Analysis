from rest_framework import serializers
from apps.gst_management.models import MonthlyGSTSummary

class MonthlyGSTSummarySerializer(serializers.ModelSerializer):
    gst_number = serializers.SerializerMethodField()
    
    def get_gst_number(self, obj):
        if hasattr(obj.business, 'gst_profile'):
            return obj.business.gst_profile.gstin
        return None

    class Meta:
        model = MonthlyGSTSummary
        fields = [
            "id", "month", "year", "gst_number",
            "total_sales", "total_tax_collected", 
            "cgst_total", "sgst_total", "igst_total",
            "total_purchases", "input_gst_total", 
            "input_cgst_total", "input_sgst_total", "input_igst_total",
            "total_expenses", "expense_gst_total", 
            "expense_cgst_total", "expense_sgst_total", "expense_igst_total",
            "net_gst_payable"
        ]
