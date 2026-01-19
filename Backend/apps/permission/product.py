from rest_framework.permissions import BasePermission
from apps.user.models import User


class ProductPermission(BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.business_id != obj.business_id:
            return False

        if user.role in [User.Role.MANAGER,User.Role.OWNER]:
            return True

        if user.work and user.work==User.Work.PRODUCT:
            return True

        return False
