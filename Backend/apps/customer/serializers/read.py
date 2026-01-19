from rest_framework import serializers

from apps.customer.models import Customer


class CustomerReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id","name","mobile_number","email","address","age","gender"]