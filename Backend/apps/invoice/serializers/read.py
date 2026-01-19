from rest_framework import serializers

from apps.invoice.models import ProductInvoice,Invoice
from apps.product.serializers.product import ProductReadSerializer
from apps.customer.serializers.read import CustomerReadSerializer

class ProductInvoiceReadSerializer(serializers.ModelSerializer):
    product=ProductReadSerializer()

    class Meta:
        model = ProductInvoice
        fields=["id","product","quantity","base_price","selling_price"]



class InvoiceReadSerializer(serializers.ModelSerializer):
    invoice_items =ProductInvoiceReadSerializer(many=True)
    customer = CustomerReadSerializer()
    created_by = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Invoice
        fields=["id","business","customer","invoice_items","payment_mode","total_amount","sub_total","created_at","created_by"]