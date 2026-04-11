from rest_framework import serializers
from apps.business.models import Branch
from apps.employee.models import UserBranch, UserRole


class UserBranchSerializer(serializers.Serializer):
    
    id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all()
    )
    name = serializers.CharField(source='branch.name', read_only=True)
    contact_number = serializers.CharField(source='branch.contact_number', read_only=True)
    is_default = serializers.BooleanField(source='branch.is_default', read_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        user = self.context.get('user')
        
        if request and user:
            target_role = user.role
            if target_role == UserRole.OWNER and not request.user.has_perm('employee.change_owner_role'):
                raise serializers.ValidationError("You do not have permission to change branches for an owner.")
            if target_role == UserRole.MANAGER and not request.user.has_perm('employee.change_branch_manager'):
                raise serializers.ValidationError("You do not have permission to change branches for a manager.")
            if target_role == UserRole.EMPLOYEE and not request.user.has_perm('employee.change_branch_employee'):
                raise serializers.ValidationError("You do not have permission to change branches for an employee.")
        return attrs

    def create(self, validated_data):
        user = self.context.get("user")
        if not user:
            raise serializers.ValidationError("User instance is required in context.")

        branch = validated_data.get("id")
        return UserBranch.objects.create(user=user, branch=branch)

