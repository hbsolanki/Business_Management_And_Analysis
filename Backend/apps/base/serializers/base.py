from rest_framework import serializers, exceptions
import re
from apps.business.models import Branch
from apps.employee.models import UserRole
from apps.subscription.utils.entitlements import check_resource_limit

class BaseSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)
    resource_limit_field = None  # Set on child serializers e.g. resource_limit_field = "max_products"

    class Meta:
        fields = ["id", "created_at", "updated_at", "created_by", "updated_by", "is_active"]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def validate_is_active(self, value):
        # If reactivating (False -> True), check resource limits
        if value is True and self.instance and not self.instance.is_active:
            if self.resource_limit_field:
                request = self.context.get("request")
                if request and hasattr(request, 'user'):
                    check_resource_limit(
                        request.user.business,
                        self.Meta.model,
                        self.resource_limit_field
                    )
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
        if isinstance(value, int):
            from apps.business.models import Branch
            try:
                value = Branch.objects.get(id=value)
            except Branch.DoesNotExist:
                raise serializers.ValidationError("Branch not found.")

        if not request:
            return value

        # Business resolution: check context first (e.g. order serializers pass it explicitly),
        # then fall back to request.user.business
        business = self.context.get("business") or getattr(getattr(request, "user", None), "business", None)

        if business:
            # Ownership check
            if value.business_id != business.id:
                raise serializers.ValidationError("Branch does not belong to your business.")

            # Active check
            if not value.is_active:
                raise serializers.ValidationError("Branch is inactive.")

        # Role-based access: MANAGER and EMPLOYEE can only use their assigned branches
        user = getattr(request, "user", None)
        if user and getattr(user, "role_name", None) in (UserRole.MANAGER, UserRole.EMPLOYEE):
            if not user.branches.filter(id=value.id).exists():
                raise serializers.ValidationError("You do not have access to this branch.")

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
