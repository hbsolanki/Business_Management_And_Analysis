from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from apps.subscription.utils.entitlements import can_use_feature, check_resource_limit


class FeaturePermission(BasePermission):
    feature_name = None

    def has_permission(self, request, view):
        if not self.feature_name:
            return True

        from django.conf import settings

        if settings.DEBUG:
            return True

        allowed, message = can_use_feature(request.user.business, self.feature_name)

        if not allowed:
            self.message = message
            return False

        return True


class ChatFeaturePermission(FeaturePermission):
    feature_name = "has_chat"


class AdvancedAnalyticsFeaturePermission(FeaturePermission):
    feature_name = "has_advanced_analytics"


class APIAccessFeaturePermission(FeaturePermission):
    feature_name = "has_api_access"


class AIAgentFeaturePermission(FeaturePermission):
    feature_name = "has_ai_agent"


class ResourceLimitPermission(BasePermission):
    """
    Permission that checks a resource count limit on POST (create)
    and on PATCH/PUT when reactivating (is_active: False -> True).

    Usage in a ViewSet:
        class ProductViewSet(ModelViewSet):
            resource_limit_field = "max_products"  # plan field name
    """

    def has_permission(self, request, view):
        limit_field = getattr(view, "resource_limit_field", None)
        if not limit_field:
            return True

        if request.method != "POST":
            return True

        business = getattr(request.user, "business", None)
        if not business:
            return True

        model = getattr(view, "queryset", None)
        if model is None:
            return True
        model = model.model

        try:
            check_resource_limit(business, model, limit_field)
        except PermissionDenied:
            raise

        return True

    def has_object_permission(self, request, view, obj):
        # Reactivation check: PATCH/PUT with is_active True on an inactive object
        limit_field = getattr(view, "resource_limit_field", None)
        if not limit_field:
            return True

        if request.method not in ("PATCH", "PUT"):
            return True

        is_active_value = request.data.get("is_active")
        if is_active_value is not True and str(is_active_value).lower() != "true":
            return True

        if getattr(obj, "is_active", True):
            # Already active, not a reactivation
            return True

        business = getattr(request.user, "business", None)
        if not business:
            return True

        model = obj.__class__
        try:
            check_resource_limit(business, model, limit_field)
        except PermissionDenied:
            raise

        return True
