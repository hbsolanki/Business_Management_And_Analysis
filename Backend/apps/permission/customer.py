from rest_framework.permissions import BasePermission
from apps.user.models import User

class CustomerPermission(BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.role in [User.Role.MANAGER, User.Role.OWNER]:
            return True

        if user.work and user.work in [User.Work.INVOICE,User.Work.ANALYTICS]:
            return True

        return False
