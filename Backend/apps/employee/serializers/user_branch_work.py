from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from apps.employee.models import UserBranchWork
from apps.base.serializers.base import BaseSerializer
from apps.business.models import Branch
from apps.employee.models import WorkType, UserRole

class UserBranchWorkSerializer(serializers.Serializer):
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False
    )
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    work_type = serializers.ChoiceField(choices=WorkType.choices)
    work_label = serializers.CharField(source='get_work_type_display', read_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        user = self.context.get('user')
        
        if request and user:
            if user.role_name == UserRole.EMPLOYEE and not request.user.has_perm('employee.change_employee_work'):
                raise PermissionDenied("You do not have permission to change work assignments for an employee.")
            # For non-employees, the EmployeeSerializer already blocks work assignments, but we can add a safety check here too
            if user.role_name != UserRole.EMPLOYEE and attrs:
                raise serializers.ValidationError("Work assignments are only allowed for employees.")
        return attrs

    def create(self, validated_data):
        user = self.context.get("user")
        if not user:
            raise serializers.ValidationError("User instance is required in context.")

        branch_instance = validated_data.get("branch_id")
        work_type = validated_data.get("work_type")
        return UserBranchWork.objects.create(user=user, branch=branch_instance, work_type=work_type)
