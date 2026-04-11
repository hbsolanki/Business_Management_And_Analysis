from rest_framework import serializers
from apps.employee.models import UserBusinessRole
from apps.business.serializers.business import BusinessSerializer

class UserBusinessRoleSerializer(serializers.ModelSerializer):
    business = BusinessSerializer(read_only=True)
    class Meta:
        model = UserBusinessRole
        fields =  ['role', 'business']
