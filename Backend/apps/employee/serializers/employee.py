import json
from rest_framework import serializers
from django.db import transaction
from rest_framework.exceptions import PermissionDenied

from apps.business.serializers.business import BusinessBasicDetailsSerializer
from apps.user.serializers.user import UserSerializer
from apps.employee.serializers.employee_details import EmployeeDetailsSerializer
from apps.employee.serializers.user_branch import UserBranchSerializer
from apps.employee.serializers.user_branch_work import UserBranchWorkSerializer
from apps.employee.serializers.user_business_role import UserBusinessRoleSerializer
from apps.employee.models import UserBusinessRole, EmployeeDetails, UserBranch, UserBranchWork, UserRole
from apps.employee.utils.permission_utils import sync_user_role_permissions

class EmployeeSerializer(serializers.Serializer):
    user = UserSerializer(source='*')
    employee_details = EmployeeDetailsSerializer()
    assigned_branches = UserBranchSerializer(many=True, required=False)
    assigned_works = UserBranchWorkSerializer(many=True, source="branch_works", required=False)
    role = serializers.CharField(source="role_name", read_only=True)
    business = BusinessBasicDetailsSerializer(read_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs

        # Check for sensitive field updates (Salary, Works, Branches)
        # Only owners/managers with can_create_employee should modify these.
        sensitive_fields = ["employee_details", "assigned_branches", "branch_works"]
        is_updating_sensitive = any(field in attrs for field in sensitive_fields)
        
        if is_updating_sensitive:
            if not request.user.has_perm('employee.can_create_employee'):
                raise PermissionDenied("You do not have permission to modify employee salary, branches, or work assignments.")
        
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        business = request.user.business

        user_data = self.initial_data.get("user")
        if not user_data:
             raise serializers.ValidationError({"user": "This field is required."})
             
        details_data = validated_data.pop("employee_details", {})
        branches_data = validated_data.pop("assigned_branches", [])
        works_data = validated_data.pop("branch_works", [])

        with transaction.atomic():
            # 1. Base User
            user_serializer = UserSerializer(data=user_data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()

            # 2. Employee Role
            UserBusinessRole.objects.create(
                user=user, business=business, role=UserRole.EMPLOYEE
            )

            # 3. Employee Details
            employee_serializer = EmployeeDetailsSerializer(
                data=details_data, context={**self.context, "user": user}
            )
            employee_serializer.is_valid(raise_exception=True)
            employee_serializer.save()

            # 4. Assigned Branches
            context = {**self.context, "user": user}
            raw_branches = self.initial_data.get("assigned_branches", branches_data)
            branch_serializer = UserBranchSerializer(
                data=raw_branches, many=True, context=context
            )
            branch_serializer.is_valid(raise_exception=True)
            branch_serializer.save()

            # 5. Assigned Works
            if works_data:
                raw_works = self.initial_data.get("assigned_works", works_data)
                work_serializer = UserBranchWorkSerializer(
                    data=raw_works, many=True, context=context
                )
                work_serializer.is_valid(raise_exception=True)
                work_serializer.save()

            # 6. Sync Permissions
            sync_user_role_permissions(user)

            return user

    def update(self, instance, validated_data):
        user_data = self.initial_data.get("user")
        if isinstance(user_data, str):
            try:
                user_data = json.loads(user_data)
            except (ValueError, TypeError):
                pass

        details_data = validated_data.pop("employee_details", None)
        branches_data = validated_data.pop("assigned_branches", None)
        works_data = validated_data.pop("branch_works", None)

        with transaction.atomic():
            # 1. Update Base User
            if user_data:
                user_serializer = UserSerializer(instance, data=user_data, partial=True)
                user_serializer.is_valid(raise_exception=True)
                instance = user_serializer.save()

                # Update Role if provided
                new_role = user_data.get("role")
                if new_role:
                    from apps.employee.models import UserBusinessRole
                    UserBusinessRole.objects.filter(user=instance).update(role=new_role)

            # 2. Update Details
            if details_data is not None:
                details, _ = EmployeeDetails.objects.get_or_create(user=instance)
                emp_serializer = EmployeeDetailsSerializer(
                    details, data=details_data, partial=True, context=self.context
                )
                emp_serializer.is_valid(raise_exception=True)
                emp_serializer.save()

            # 3. Sync Branches Array
            if branches_data is not None:
                UserBranch.objects.filter(user=instance).delete()
                if branches_data:
                    context = {**self.context, "user": instance}
                    raw_branches = self.initial_data.get("assigned_branches", branches_data)
                    if isinstance(raw_branches, str):
                        try:
                            raw_branches = json.loads(raw_branches)
                        except (ValueError, TypeError):
                            pass
                    branch_serializer = UserBranchSerializer(
                        data=raw_branches, many=True, context=context
                    )
                    branch_serializer.is_valid(raise_exception=True)
                    branch_serializer.save()

            # 4. Sync Works Array
            if works_data is not None:
                UserBranchWork.objects.filter(user=instance).delete()
                if works_data:
                    context = {**self.context, "user": instance}
                    raw_works = self.initial_data.get("assigned_works", works_data)
                    if isinstance(raw_works, str):
                        try:
                            raw_works = json.loads(raw_works)
                        except (ValueError, TypeError):
                            pass
                    work_serializer = UserBranchWorkSerializer(
                        data=raw_works, many=True, context=context
                    )
                    work_serializer.is_valid(raise_exception=True)
                    work_serializer.save()

            return instance
