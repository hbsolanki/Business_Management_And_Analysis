from rest_framework.viewsets import GenericViewSet
from apps.base.permission.model_permissions import ModelPermissions
from django_filters.rest_framework import DjangoFilterBackend
from apps.base.pagination import CursorPagination
from apps.master.permission.custom_permissions import BranchWorkPermission
from rest_framework.throttling import UserRateThrottle
from apps.employee.models import UserRole
from apps.master.utils.cache import make_cache_key, invalidate_cache


class BaseUserThrottle(UserRateThrottle):
    rate = '60/min'


class BaseViewSet(GenericViewSet):
    permission_classes = [ModelPermissions, BranchWorkPermission]
    throttle_classes = [BaseUserThrottle]
    filter_backends = [DjangoFilterBackend]
    pagination_class = CursorPagination

    # Override in subclass to map actions to serializer classes.
    # e.g. serializer_action_classes = {"create": MyCreateSerializer}
    serializer_action_classes = {}

    def get_serializer_class(self):
        # Action-specific serializer takes priority over the default
        if self.serializer_action_classes:
            klass = self.serializer_action_classes.get(self.action)
            if klass:
                return klass
        return super().get_serializer_class()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.is_superuser:
            return queryset

        # Hook 1: business-level isolation (override for indirect paths)
        queryset = self.apply_business_filter(queryset, user)

        # Hook 2: branch-level isolation (override for indirect paths)
        queryset = self.apply_branch_filter(queryset, user)

        return queryset

    def apply_business_filter(self, queryset, user):
        """
        Filters queryset to only include records belonging to the user's business.
        Override in subclass when the business path is indirect
        (e.g. monthly_summary__business instead of business).
        """
        model = queryset.model
        if model.__name__ == 'User':
            return queryset.filter(business_roles__business=user.business)
        elif model.__name__ == 'Branch':
            return queryset.filter(business=user.business)
        elif hasattr(model, 'business'):
            return queryset.filter(business=user.business)
        return queryset

    def apply_branch_filter(self, queryset, user):
        """
        Filters queryset by branch based on user role and query params.
        Override in subclass when the branch path is indirect
        (e.g. monthly_summary__branch instead of branch).
        """
        model = queryset.model
        branch_id = self.request.query_params.get('branch')

        if model.__name__ == 'Branch':
            if user.role_name != UserRole.OWNER:
                queryset = queryset.filter(id__in=user.branches.values_list('id', flat=True))
            return queryset

        if hasattr(model, 'branch'):
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

    def get_cache_key(self, base_name, prefix):
        """Generate a consistent, versioned cache key for this request."""
        return make_cache_key(self.request, base_name, prefix, self.request.user)

    def invalidate(self, base_name, prefix=None):
        """Bust the versioned cache for this user's business."""
        invalidate_cache(base_name, prefix or self.action, self.request.user)

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
