from rest_framework import serializers
from apps.analytics.serializers.filter.base import DateRangeSerializer, BranchFilterSerializer
from apps.analytics.serializers.filter.product import ProductFilterSerializer

class CustomerFilterSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False)
    mobile_number = serializers.CharField(required=False)

class CustomerCreatedAtRangeFilterSerializer(DateRangeSerializer, BranchFilterSerializer):
    pass

class CustomerInvoiceFilterSerializer(DateRangeSerializer, CustomerFilterSerializer, BranchFilterSerializer):
    pass

class CustomerInvoiceProductFilterSerializer(DateRangeSerializer, CustomerFilterSerializer, ProductFilterSerializer, BranchFilterSerializer):
    pass

class CustomerMonthYearFilterSerializer(serializers.Serializer):
    month = serializers.IntegerField(min_value=1, max_value=12,required=False)
    year = serializers.IntegerField(min_value=2000,required=False)
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")
