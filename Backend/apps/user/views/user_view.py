import random
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet
from apps.user.filters import UserFilter
from django.db.models import Q
from apps.user.models import User
from rest_framework.response import Response
from django.core.cache import cache
from apps.base.views.base_view import BaseViewSet
from apps.user.serializers.user import UserSerializer
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.employee.serializers.owner import OwnerSerializer
from apps.employee.serializers.manager import ManagerSerializer
from apps.employee.serializers.employee import EmployeeSerializer
from apps.employee.utils.permission_utils import sync_user_work_groups as sync_user_work_group
from apps.activity_log.models import ActivityLog
from apps.activity_log.mixins import ActivityLogMixin
from apps.employee.models import UserBusinessRole, UserRole


class UserViewSet(ActivityLogMixin,BaseViewSet,ModelViewSet):
    activity_module = ActivityLog.Module.USER
    filterset_class = UserFilter

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [AllowAny]

        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user

        if user.business:
            return User.objects.filter(
                business_roles__business=user.business
            ).distinct().order_by("-is_active", "-created_at")

        return User.objects.filter(id=user.id).order_by("-is_active", "-created_at")

    def get_serializer_class(self):
        if self.action == "list":
            return UserBasicDetailsSerializer

        if self.action == "create":
            return OwnerSerializer

        if self.action in ["retrieve", "update", "partial_update"]:
            obj = self.get_object()
            if obj.role_name == UserRole.MANAGER:
                return ManagerSerializer
            if obj.role_name == UserRole.EMPLOYEE:
                return EmployeeSerializer

            return OwnerSerializer

        return UserSerializer

    def retrieve(self, request, *args, **kwargs):
        key = f"user:{kwargs['pk']}"
        data = cache.get(key)
        if data is None:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            data = serializer.data
            cache.set(key, data, 120 + random.randint(0, 40))

        return Response(data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        output_serializer = UserSerializer(
            serializer.instance, context=self.get_serializer_context()
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        user = serializer.instance
        sync_user_work_group(user)
        cache.delete(f"user:{user.id}")

    def perform_destroy(self, instance):
        from django.db import transaction
        with transaction.atomic():
            cache.delete(f"user:{instance.id}")
            
            # Cascading soft delete for related records
            instance.business_roles.all().update(is_deleted=True, is_active=False)
            instance.assigned_branches.all().update(is_deleted=True, is_active=False)
            instance.branch_works.all().update(is_deleted=True, is_active=False)
            
            if hasattr(instance, 'employee_details'):
                details = instance.employee_details
                details.is_deleted = True
                details.is_active = False
                details.save(update_fields=["is_deleted", "is_active"])
            
            super().perform_destroy(instance)

    @action(detail=False, methods=['post'], url_path='logout')
    def logout(self, request):
        user = request.user
        user.last_login = None
        user.save(update_fields=["last_login"])

        ActivityLog.objects.log(
            business=user.business,
            actor=user,
            action=ActivityLog.Action.CUSTOM,
            module=ActivityLog.Module.USER,
            message=f"{user.username} logged out"
        )

        return Response({"message": "Successfully logged out"}, status=status.HTTP_200_OK)

