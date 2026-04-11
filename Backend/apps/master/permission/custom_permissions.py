from rest_framework import permissions
from apps.employee.models import UserRole

class IsOwnerOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role_name in [UserRole.OWNER, UserRole.MANAGER]

class BranchWorkPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        
        if user.role_name == UserRole.OWNER:
            return True

        required_work = getattr(view, "required_work", None)
        if user.role_name == UserRole.EMPLOYEE and required_work:
            return user.assigned_works.filter(work_type=required_work).exists()

        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if user.role_name == UserRole.OWNER:
            return True

        if hasattr(obj, 'branch') and obj.branch:
            if obj.branch.business != user.business:
                return False
            return user.branches.filter(id=obj.branch.id).exists()
            
        if hasattr(obj, 'business'):
            return obj.business == user.business

        return True
