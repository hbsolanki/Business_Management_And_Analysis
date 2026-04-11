from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.employee.models import EmployeeDetails, UserRole, EmployeeAddress
from apps.base.serializers.base import BaseSerializer
from apps.employee.serializers.employee_address import EmployeeAddressSerializer


class EmployeeDetailsSerializer(BaseSerializer):
    address = EmployeeAddressSerializer(required=False)

    class Meta(BaseSerializer.Meta):
        model = EmployeeDetails
        fields = BaseSerializer.Meta.fields + [
            "salary", "bio", "address"
        ]

    def validate_salary(self, value):
        request = self.context.get('request')
        user = getattr(self.instance, 'user', self.context.get('user'))
        
        if request and user:
            target_role = user.role_name
            if target_role == UserRole.MANAGER and not request.user.has_perm('employee.change_manager_salary'):
                raise PermissionDenied("You do not have permission to update a manager's salary.")
            if target_role == UserRole.EMPLOYEE and not request.user.has_perm('employee.change_employee_salary'):
                raise PermissionDenied("You do not have permission to update an employee's salary.")
            if target_role == UserRole.OWNER:
                raise serializers.ValidationError("Owners do not have salaries to update.")
        
        return value

    def create(self, validated_data):
        address_data = validated_data.pop('address', None)
        user = self.context.get("user")
        if user and "user" not in validated_data:
            validated_data["user"] = user
        if address_data:
            address_serializer = EmployeeAddressSerializer(data=address_data)
            address_serializer.is_valid(raise_exception=True)
            validated_data['address'] = address_serializer.save()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        address_data = validated_data.pop('address', None)
        if address_data is not None:
            if instance.address:
                address_serializer = EmployeeAddressSerializer(instance.address, data=address_data, partial=True)
            else:
                address_serializer = EmployeeAddressSerializer(data=address_data)
            address_serializer.is_valid(raise_exception=True)
            instance.address = address_serializer.save()
            instance.save(update_fields=["address"])
        return super().update(instance, validated_data)
