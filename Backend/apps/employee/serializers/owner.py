from rest_framework import serializers
from django.db import transaction

from apps.business.serializers.business import BusinessSerializer
from apps.business.serializers.business import BusinessSerializer
from apps.user.serializers.user import UserSerializer
from apps.employee.serializers.employee_details import EmployeeDetailsSerializer
from apps.employee.serializers.user_business_role import UserBusinessRoleSerializer
from apps.employee.models import UserBusinessRole, EmployeeDetails, UserRole

class OwnerSerializer(serializers.Serializer):
    user = UserSerializer(source='*')
    role = serializers.CharField(source="role_name", read_only=True)
    business = BusinessSerializer(read_only=True)
    assigned_works = serializers.ListField(child=serializers.CharField(), read_only=True, source="assigned_works_list")

    def create(self, validated_data):
        user_data = self.initial_data.get("user")
        if not user_data:
            raise serializers.ValidationError({"user": "This field is required."})

        details_data = validated_data.pop("employee_details", None)

        with transaction.atomic():
            # 1. Base User
            user_serializer = UserSerializer(data=user_data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()

            # 2. Owner Role
            UserBusinessRole.objects.create(user=user, role=UserRole.OWNER)

            # 3. Employee Details (Address/Bio)
            if details_data:
                details_serializer = EmployeeDetailsSerializer(
                    data=details_data, 
                    context={**self.context, "user": user}
                )
                details_serializer.is_valid(raise_exception=True)
                details_serializer.save()

            return user

    def update(self, instance, validated_data):
        user_data = self.initial_data.get("user")
        details_data = validated_data.pop("employee_details", None)

        with transaction.atomic():
            # 1. Update Base User
            if user_data:
                user_serializer = UserSerializer(instance, data=user_data, partial=True)
                user_serializer.is_valid(raise_exception=True)
                instance = user_serializer.save()

            # 2. Update Details
            if details_data is not None:
                details, _ = EmployeeDetails.objects.get_or_create(user=instance)
                details_serializer = EmployeeDetailsSerializer(details, data=details_data, partial=True)
                details_serializer.is_valid(raise_exception=True)
                details_serializer.save()

            return instance