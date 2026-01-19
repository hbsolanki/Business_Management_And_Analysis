from rest_framework import serializers
from apps.invoice.models import Invoice

class BusinessNetProfitSerializer(serializers.ModelSerializer):
    profit=serializers.FloatField(source='sub_total')
    class Meta:
        model = Invoice
        fields =["profit"]