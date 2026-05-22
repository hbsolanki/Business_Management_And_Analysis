from rest_framework.permissions import BasePermission
from apps.subscription.utils.entitlements import can_use_feature


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
