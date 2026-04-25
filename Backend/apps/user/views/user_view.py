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
from django.core.mail import send_mail
from django.conf import settings


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

        if self.action in ["retrieve", "update", "partial_update", "me"]:
            obj = self.get_object() if self.action != "me" else self.request.user
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

    def create(self, request, *args, **kwargs):
        user_data = request.data.get("user")
        if not user_data:
            return Response({"error": "User data required"}, status=status.HTTP_400_BAD_REQUEST)
        
        email = user_data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check if email is blocked (1-hour lock)
        block_key = f"otp_block_{email}"
        if cache.get(block_key):
            return Response({
                "error": "This email is temporarily blocked due to too many attempts. Please try again after 1 hour."
            }, status=status.HTTP_403_FORBIDDEN)

        otp = request.data.get("otp")
        if not otp:
            return Response({"error": "OTP is required for registration"}, status=status.HTTP_400_BAD_REQUEST)
            
        cached_otp = cache.get(f"otp_registration_{email}")
        
        # 2. Track verification attempts
        attempt_key = f"otp_verify_attempts_{email}"
        attempts = cache.get(attempt_key, 0)
        
        if not cached_otp or str(cached_otp) != str(otp):
            attempts += 1
            cache.set(attempt_key, attempts, 3600) # Keep track for an hour
            
            if attempts >= 3:
                cache.set(block_key, True, 3600)
                return Response({
                    "error": "Too many invalid OTP attempts. Your email is now blocked for 1 hour."
                }, status=status.HTTP_403_FORBIDDEN)
                
            return Response({
                "error": f"Invalid or expired OTP. {3 - attempts} attempts remaining."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # OTP is valid, proceed with creation
        response = super().create(request, *args, **kwargs)
        
        # Clear tracking after successful registration
        if response.status_code == status.HTTP_201_CREATED:
            cache.delete(f"otp_registration_{email}")
            cache.delete(attempt_key)
            cache.delete(f"otp_send_attempts_{email}")
            
        return response

    @action(detail=False, methods=['post'], url_path='send-otp', permission_classes=[AllowAny])
    def send_otp(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if email is blocked
        block_key = f"otp_block_{email}"
        if cache.get(block_key):
            return Response({
                "error": "This email is temporarily blocked due to too many attempts. Please try again after 1 hour."
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({"error": "A user with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Track send attempts
        send_attempt_key = f"otp_send_attempts_{email}"
        send_count = cache.get(send_attempt_key, 0)
        
        if send_count >= 3:
            cache.set(block_key, True, 3600)
            return Response({
                "error": "You have requested OTP too many times. Your email is now blocked for 1 hour."
            }, status=status.HTTP_403_FORBIDDEN)

        otp = str(random.randint(100000, 999999))
        cache.set(f"otp_registration_{email}", otp, 600)  # 10 minutes
        
        # Increment send count
        cache.set(send_attempt_key, send_count + 1, 3600)

        try:
            import sib_api_v3_sdk
            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key['api-key'] = settings.BREVO_API_KEY
            
            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
            
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": email}],
                sender={"email": settings.DEFAULT_FROM_EMAIL, "name": "BMA"},
                subject="Your BMA Verification Code",
                html_content=f"<html><body><h3>Verification Code</h3><p>Your code for registration is: <strong>{otp}</strong></p><p>This code will expire in 10 minutes.</p></body></html>"
            )
            
            api_instance.send_transac_email(send_smtp_email)
            return Response({"message": f"OTP sent successfully. {2 - send_count} requests remaining."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"BREVO API ERROR: {e}")
            # Fallback to local log for debugging if API fails
            from django.core.mail import send_mail
            send_mail(
                subject="[FALLBACK] Your BMA Verification Code",
                message=f"Code: {otp}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True
            )
            return Response({"message": f"OTP sent (check debug logs). {2 - send_count} requests remaining."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

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

