from rest_framework.permissions import BasePermission
from apps.user.models import User


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.OWNER
        )


class IsOwnerOrManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in {
                User.Role.OWNER,
                User.Role.MANAGER,
            }
        )


class CanModifyUser(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user.is_authenticated:
            return False

        if user.business_id != obj.business_id:
            return False

        if user.id == obj.id:
            return True

        if user.role == User.Role.OWNER:
            return True

        if user.role == User.Role.MANAGER:
            return obj.role == User.Role.EMPLOYEE

        return False


class CanDeleteUser(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user.is_authenticated:
            return False

        if user.id == obj.id:
            return False

        if user.business_id != obj.business_id:
            return False

        if user.role == User.Role.OWNER:
            return True

        if (
            user.role == User.Role.MANAGER
            and obj.role == User.Role.EMPLOYEE
        ):
            return True

        return False
