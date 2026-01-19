from rest_framework import serializers
from apps.customer.models import Customer

class CustomerUpdateSerializer(serializers.ModelSerializer):
    gender = serializers.ChoiceField(choices=[('male', 'male'), ('female', 'female')])
    class Meta:
        model = Customer
        fields=["name","mobile_number","gender","age","address","email"]
