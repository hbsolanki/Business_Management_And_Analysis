from rest_framework import serializers
from apps.invoice.models import Invoice
from apps.supplier.models import SalesOrder, PurchaseOrder
from apps.cost.models import Expense, MonthlyCostCategory

class InvoiceLedgerSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source="created_at", format="%Y-%m-%d")
    type = serializers.SerializerMethodField()
    reference = serializers.SerializerMethodField()
    party_name = serializers.CharField(source="customer.name", default="Counter Sale")
    base_amount = serializers.DecimalField(source="sub_total", max_digits=15, decimal_places=2)
    tax_amount = serializers.DecimalField(source="gst.gst_amount", max_digits=15, decimal_places=2, default=0)
    gst_rate = serializers.DecimalField(source="gst.gst_rate", max_digits=5, decimal_places=2, default=0)
    status = serializers.CharField(default="PAID")

    class Meta:
        model = Invoice
        fields = [
            "id", "date", "type", "reference", "party_name", 
            "base_amount", "tax_amount", "total_amount", "gst_rate", "status", "branch"
        ]

    def get_type(self, obj):
        return "INVOICE"

    def get_reference(self, obj):
        return f"INV-{obj.id}"

class PurchaseOrderLedgerSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source="received_at", format="%Y-%m-%d")
    type = serializers.SerializerMethodField()
    reference = serializers.SerializerMethodField()
    party_name = serializers.CharField(source="supplier.name")
    base_amount = serializers.SerializerMethodField()
    tax_amount = serializers.DecimalField(source="gst.gst_amount", max_digits=15, decimal_places=2, default=0)
    gst_rate = serializers.DecimalField(source="gst.gst_rate", max_digits=5, decimal_places=2, default=0)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "date", "type", "reference", "party_name", 
            "base_amount", "tax_amount", "total_amount", "gst_rate", "status", "branch"
        ]

    def get_type(self, obj):
        return "PURCHASE_ORDER"

    def get_reference(self, obj):
        return f"PO-{obj.id}"

    def get_base_amount(self, obj):
        tax = obj.gst.gst_amount if obj.gst else 0
        return obj.total_amount - tax

class ExpenseLedgerSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    reference = serializers.CharField(source="title")
    party_name = serializers.CharField(source="category.name", default="General Expense")
    base_amount = serializers.DecimalField(source="amount", max_digits=15, decimal_places=2)
    tax_amount = serializers.DecimalField(source="gst.gst_amount", max_digits=15, decimal_places=2, default=0)
    gst_rate = serializers.DecimalField(source="gst.gst_rate", max_digits=5, decimal_places=2, default=0)
    status = serializers.CharField(default="RECORDED")

    class Meta:
        model = Expense
        fields = [
            "id", "date", "type", "reference", "party_name", 
            "base_amount", "tax_amount", "total_amount", "gst_rate", "status", "itc_type", "branch"
        ]

    def get_type(self, obj):
        return "EXPENSE"

class MonthlyCostCategoryLedgerSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="cost_category.name")
    gst_rate = serializers.DecimalField(source="cost_category.gst_rate", max_digits=5, decimal_places=2, read_only=True)
    month = serializers.IntegerField(source="monthly_summary.month")
    year = serializers.IntegerField(source="monthly_summary.year")

    gst_amount = serializers.DecimalField(source="gst.gst_amount", max_digits=12, decimal_places=2, read_only=True, default=0)
    cgst_total = serializers.DecimalField(source="gst.cgst_amount", max_digits=12, decimal_places=2, read_only=True, default=0)
    sgst_total = serializers.DecimalField(source="gst.sgst_amount", max_digits=12, decimal_places=2, read_only=True, default=0)
    igst_total = serializers.DecimalField(source="gst.igst_amount", max_digits=12, decimal_places=2, read_only=True, default=0)
    total_cost = serializers.DecimalField(source="gst.total_amount", max_digits=12, decimal_places=2, read_only=True, default=0)

    class Meta:
        model = MonthlyCostCategory
        fields = [
            "id", "category_name", "cost", "gst_rate", "gst_amount",
            "cgst_total", "sgst_total", "igst_total", "total_cost",
            "month", "year"
        ]



