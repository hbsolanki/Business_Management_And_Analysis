from rest_framework import serializers
from apps.user.models import User
from apps.base.serializers.base import BaseSerializer
from apps.business.serializers.business import BusinessSerializer
from apps.employee.serializers.employee_details import EmployeeDetailsSerializer
from apps.employee.serializers.user_branch import UserBranchSerializer
from apps.employee.serializers.user_branch_work import UserBranchWorkSerializer


class UserBasicDetailsSerializer(BaseSerializer):
    role = serializers.CharField(source="role_name", read_only=True)
    business = BusinessSerializer(read_only=True)
    assigned_branches = UserBranchSerializer(many=True, read_only=True)
    employee_details = EmployeeDetailsSerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = User
        fields = BaseSerializer.Meta.fields + [
            "first_name",
            "last_name",
            "username",
            "mobile_number",
            "profile_picture",
            "email",
            "is_active",
            "role",
            "business",
            "employee_details",
            "assigned_branches",
        ]
