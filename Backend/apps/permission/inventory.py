from rest_framework.permissions import BasePermission
from apps.user.models import User


class InventoryPermission(BasePermission):

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.role in [User.Role.MANAGER, User.Role.OWNER]:
            return True

        if user.work and user.work == User.Work.INVOICE:
            return True

        return False
