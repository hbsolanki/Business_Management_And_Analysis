from rest_framework.viewsets import GenericViewSet
from apps.base.permission.model_permissions import ModelPermissions
from django_filters.rest_framework import DjangoFilterBackend
from apps.base.pagination import CursorPagination
from apps.master.permission.custom_permissions import BranchWorkPermission
from apps.employee.models import UserRole


class BaseViewSet(GenericViewSet):
    permission_classes=[ModelPermissions, BranchWorkPermission]
    filter_backends =[DjangoFilterBackend]
    pagination_class= CursorPagination

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.is_superuser:
            return queryset

        if hasattr(queryset.model, 'business'):
            if queryset.model.__name__ == 'User':
                queryset = queryset.filter(business_roles__business=user.business)
            else:
                queryset = queryset.filter(business=user.business)

        branch_id = self.request.query_params.get('branch')
        
        if hasattr(queryset.model, 'branch'):
            if user.role_name == UserRole.OWNER:
                if branch_id:
                    queryset = queryset.filter(branch_id=branch_id)
            else:
                assigned_branches = user.branches.all()
                if branch_id:
                    queryset = queryset.filter(branch_id=branch_id, branch__in=assigned_branches)
                else:
                    queryset = queryset.filter(branch__in=assigned_branches)

        return queryset

    def perform_create(self, serializer):
        created_by = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=created_by)

    def perform_update(self, serializer):
        updated_by = self.request.user if self.request.user.is_authenticated else None
        serializer.save(updated_by=updated_by)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=["is_deleted", "is_active"])


