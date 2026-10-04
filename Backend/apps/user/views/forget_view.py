import logging
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.viewsets import GenericViewSet

from apps.user.models import User
from apps.user.serializers import forget as forget_serializers
from apps.master.serializers.otp import ValidateOTPSerializer
from apps.user.tasks import send_username_email
from apps.master.utils.otp import mask_email, generate_and_send_otp, verify_otp

logger = logging.getLogger(__name__)


class ForgetPasswordThrottle(AnonRateThrottle):
    rate = "5/min"


class ForgetViewSet(GenericViewSet):
    permission_classes = [AllowAny]
    throttle_classes = [ForgetPasswordThrottle]

    def get_serializer_class(self):
        return {
            "validate_username": forget_serializers.ValidateUsernameSerializer,
            "validate_otp": ValidateOTPSerializer,
            "reset": forget_serializers.ResetPasswordSerializer,
            "forget_username": forget_serializers.ForgetUsernameSerializer,
        }.get(self.action)

    def _validated_data(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _fp_key(self, username: str) -> str:
        return f"fp:{username}"

    def _fp_verified_key(self, username: str) -> str:
        return f"fp_verified:{username}"

    @action(detail=False, methods=["post"], url_path="password/validate-username")
    def validate_username(self, request):
        try:
            data = self._validated_data(request)
            user = User.objects.filter(username=data["username"]).first()

            # Always return the same message to prevent username enumeration
            if not user or not user.email:
                return Response(
                    {"message": "If the account exists, an OTP has been sent"}
                )

            generate_and_send_otp(
                identifier=user.username, email=user.email, purpose="forgot_password"
            )

            return Response(
                {"message": f"OTP sent to {mask_email(user.email)}"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @verify_otp(identifier_field="username", purpose="forgot_password")
    @action(detail=False, methods=["post"], url_path="password/validate-otp")
    def validate_otp(self, request):
        try:
            self._validated_data(request)
            return Response({"message": "OTP verified"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="password/reset")
    def reset(self, request):
        try:
            data = self._validated_data(request)
            username, password = data["username"], data["password"]

            if not cache.get(self._fp_verified_key(username)):
                return Response(
                    {"error": "OTP not verified"}, status=status.HTTP_403_FORBIDDEN
                )

            user = User.objects.filter(username=username).first()
            if not user:
                return Response(
                    {"error": "Invalid user"}, status=status.HTTP_400_BAD_REQUEST
                )

            try:
                validate_password(password, user=user)
            except DjangoValidationError as exc:
                return Response(
                    {"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(password)
            user.save(update_fields=["password"])
            cache.delete(self._fp_verified_key(username))

            return Response(
                {"message": "Password reset successfully"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="username")
    def forget_username(self, request):
        try:
            data = self._validated_data(request)
            user = User.objects.filter(email__iexact=data["email"]).first()

            if user:
                try:
                    send_username_email.delay(
                        to_email=data["email"], username=user.username
                    )
                except Exception:
                    logger.exception(
                        "Failed to dispatch Celery task for username retrieval email"
                    )
                    return Response(
                        {
                            "error": "Email dispatch service is temporarily unavailable. Please try again later."
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            # Always return same message to prevent email enumeration
            return Response(
                {"message": "If the email exists, the username has been sent"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
