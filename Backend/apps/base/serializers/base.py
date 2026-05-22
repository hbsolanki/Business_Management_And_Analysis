from rest_framework import serializers
import re
from apps.business.models import Branch
from apps.employee.models import UserRole
from apps.subscription.utils.entitlements import check_resource_limit

class BaseSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        fields = ["id", "created_at", "updated_at", "created_by", "updated_by", "is_active"]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def validate_is_active(self, value):
        
        # If we are changing from False to True (reactivating), we must check the limits
        if value is True and getattr(self, 'instance', None) and not self.instance.is_active:
            model = self.Meta.model
            limit_mapping = {
                'Branch': 'max_branches',
                'Product': 'max_products',
                'User': 'max_staff'
            }
            if model.__name__ in limit_mapping:
                request = self.context.get("request")
                if request and hasattr(request, 'user'):
                    check_resource_limit(request.user.business, model, limit_mapping[model.__name__])
                    
        return value

    def validate(self, attrs):
        # Prevent any updates to inactive resources, except for reactivating them
        if self.instance and hasattr(self.instance, 'is_active') and not self.instance.is_active:
            
            # If the instance is inactive, they MUST be attempting to explicitly pass `is_active=True`
            if 'is_active' not in attrs or not attrs['is_active']:
                raise serializers.ValidationError("Cannot update an inactive resource. You must reactivate it first.")
            
            # If they pass `is_active=True`, they CANNOT concurrently update other payload fields in one request.
            if len(attrs) > 1:
                raise serializers.ValidationError("When a resource is inactive, you can only update its 'is_active' status.")
                
        return attrs

    def validate_branch_id(self, value):
        if value is None:
            return None
        request = self.context.get("request")
        if not request or not hasattr(request, "user") or request.user is None:
            return value
        user = request.user
        
        # If value is already a Branch instance (e.g. from PrimaryKeyRelatedField), use it
        if isinstance(value, Branch):
            branch = value
        else:
            try:
                branch = Branch.objects.get(id=value, business=request.user.business, is_active=True)
            except (Branch.DoesNotExist, ValueError, TypeError):
                raise serializers.ValidationError("Branch not found or branch inactive.")

        # Business Ownership check (crucial for PrimaryKeyRelatedField which defaults to Branch.objects.all())
        if branch.business != request.user.business:
            raise serializers.ValidationError("This branch does not belong to your business.")

        # Role-based assignment check
        if request.user.role_name in (UserRole.MANAGER, UserRole.EMPLOYEE) and not request.user.branches.filter(id=branch.id).exists():
            raise serializers.ValidationError("You do not have access to this branch.")

        self._validated_branch = branch
        return value

    def validate_gst_number(self, value):
        if value:
            pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
            if not re.match(pattern, value):
                raise serializers.ValidationError("Invalid GST number format")
        return value

    def validate_mobile_number(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Mobile number must contain only digits.")
        if len(value) != 10:
            raise serializers.ValidationError("Mobile number must be exactly 10 digits.")
        return value

class BulkIdSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

    def validate_ids(self, value):
        return value
