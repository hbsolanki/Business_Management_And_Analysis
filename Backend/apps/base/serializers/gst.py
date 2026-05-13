from rest_framework import serializers
from apps.base.models import GST

class GSTSerializer(serializers.ModelSerializer):
    class Meta:
        model = GST
        fields = ["id", "gst_rate", "gst_amount", "cgst_amount", "sgst_amount", "igst_amount", "total_amount"]
        read_only_fields = ["id"]
