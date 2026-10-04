import secrets
import logging

from django.core.cache import cache
from django.contrib.auth import authenticate
from django.db import transaction
from django.db.utils import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.viewsets import ModelViewSet

from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog
from apps.base.views.base_view import BaseViewSet
from apps.employee.models import UserRole
from apps.employee.serializers.employee import EmployeeSerializer
from apps.employee.serializers.manager import ManagerSerializer
from apps.employee.serializers.owner import OwnerSerializer
from apps.master.serializers.otp import OtpValidationSerializer, SendOTPSerializer
from apps.master.utils.otp import verify_otp, generate_and_send_otp
from apps.employee.utils.permission_utils import (
    sync_user_work_groups as sync_user_work_group,
)
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.user.filters import UserFilter
from apps.user.models import User
from apps.user.serializers.user import UserSerializer, UserLoginSerializer


class LoginThrottle(AnonRateThrottle):
    rate = '5/min'

logger = logging.getLogger(__name__)


class UserViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.USER
    filterset_class = UserFilter

    def get_permissions(self):
        if self.action in ("create", "login", "send_otp"):
            return [AllowAny()]
        return super().get_permissions()

    def get_throttles(self):
        if self.action == "login":
            return [LoginThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        if user.business:
            return (
                User.objects.filter(business_roles__business=user.business)
                .distinct()
                .order_by("-is_active", "-created_at")
            )
        return User.objects.filter(id=user.id).order_by("-is_active", "-created_at")

    def get_serializer_class(self):
        if self.action == "list":
            return UserBasicDetailsSerializer
        if self.action == "create":
            return OwnerSerializer
        if self.action == "login":
            return UserLoginSerializer
        if self.action in ["retrieve", "update", "partial_update", "me"]:
            obj = self.request.user if self.action == "me" else self.get_object()
            role_serializers = {
                UserRole.MANAGER: ManagerSerializer,
                UserRole.EMPLOYEE: EmployeeSerializer,
            }
            return role_serializers.get(obj.role_name, OwnerSerializer)
        return UserSerializer

    @verify_otp(identifier_field="email", purpose="registration")
    def create(self, request, *args, **kwargs):
        # 1. Structural Validation
        otp_serializer = OtpValidationSerializer(data=request.data)
        otp_serializer.is_valid(raise_exception=True)

        email = otp_serializer.validated_data["user"].get("email", "").strip().lower()

        # Mutate a copy so we don't alter the original QueryDict
        request.data["user"]["email"] = email

        # 2. Proceed with actual User Creation
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            logger.exception("Database integrity error during user registration")
            return Response(
                {
                    "error": "A user with this username or email already exists due to a database conflict."
                },
                status=status.HTTP_409_CONFLICT,
            )

    def retrieve(self, request, *args, **kwargs):
        key = f"user:{kwargs['pk']}"
        data = cache.get(key)
        if data is None:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            data = serializer.data
            # Jitter prevents cache stampede on high-traffic instances
            cache.set(key, data, 120 + secrets.randbelow(40))
        return Response(data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        # Use get_serializer to get the role-aware output serializer (same as retrieve)
        output_serializer = self.get_serializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        user = serializer.instance
        sync_user_work_group(user)
        cache.delete(f"user:{user.id}")

    def perform_destroy(self, instance):
        with transaction.atomic():
            cache.delete(f"user:{instance.id}")

            # Cascade soft-delete
            instance.business_roles.all().update(is_deleted=True, is_active=False)
            instance.assigned_branches.all().update(is_deleted=True, is_active=False)
            instance.branch_works.all().update(is_deleted=True, is_active=False)

            if hasattr(instance, "employee_details"):
                instance.employee_details.is_deleted = True
                instance.employee_details.is_active = False
                instance.employee_details.save(
                    update_fields=["is_deleted", "is_active"]
                )

            # Soft-delete user
            instance.is_deleted = True
            instance.is_active = False
            instance.save(update_fields=["is_deleted", "is_active"])

            # Log delete
            ActivityLog.objects.log(
                business=self.request.user.business,
                actor=self.request.user,
                action=ActivityLog.Action.DELETE,
                module=self.activity_module,
                target_model=instance.__class__.__name__,
                target_id=instance.id,
                message=f"Deleted {instance.__class__.__name__}",
            )

    @action(detail=False, methods=["post"], url_path="login", url_name="login")
    def login(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        user = authenticate(username=username, password=password)

        if not user or not user.is_active:
            return Response(
                {"error": "Invalid Credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        ActivityLog.objects.log(
            business=user.business,
            actor=user,
            action=ActivityLog.Action.LOGIN,
            module=ActivityLog.Module.USER,
            message=f"User {user.username} logged in",
        )

        from apps.user.utils.token import get_tokens_for_user
        return Response(get_tokens_for_user(user), status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        url_path="send-otp",
        permission_classes=[AllowAny],
    )
    def send_otp(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        # Reject if user already registered
        if User.all_objects.filter(email__iexact=email).exists():
            return Response(
                {"error": "A user with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        generate_and_send_otp(identifier=email, email=email, purpose="registration")

        # Get count just to display remaining attempts
        send_count = cache.get(f"otp_send_attempts_{email}", 1)
        remaining = max(0, 3 - send_count)

        return Response(
            {
                "message": f"OTP sent successfully. {remaining} request{'s' if remaining != 1 else ''} remaining."
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="logout")
    def logout(self, request):
        try:
            user = request.user
            user.last_login = None
            user.save(update_fields=["last_login"])

            ActivityLog.objects.log(
                business=user.business,
                actor=user,
                action=ActivityLog.Action.CUSTOM,
                module=ActivityLog.Module.USER,
                message=f"{user.username} logged out",
            )

            return Response(
                {"message": "Successfully logged out"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
