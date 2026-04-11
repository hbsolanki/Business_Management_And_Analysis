from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import GenericViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.user.models import User
from apps.user.serializers import forget
from apps.user.tasks import send_username_email, send_otp_email
from apps.user.utils.forgot_password import mask_email, generate_otp


class ForgetPasswordThrottle(AnonRateThrottle):
    rate = "5/min"


class ForgetViewSet(GenericViewSet):
    permission_classes = [AllowAny]
    throttle_classes = [ForgetPasswordThrottle]

    def validate(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def user_by_username(self, username):
        return User.objects.filter(username=username).first()

    def fp_key(self, username):
        return f"fp:{username}"

    def fp_verified_key(self, username):
        return f"fp_verified:{username}"

    def get_serializer_class(self):
        if self.action == "validate_username":
            return forget.ValidateUsernameSerializer
        elif self.action == "validate_otp":
            return forget.ValidateOTPSerializer
        elif self.action == "reset":
            return forget.ResetPasswordSerializer
        elif self.action == "forget_username":
            return forget.ForgetUsernameSerializer
        return None

    @action(detail=False, methods=["post"], url_path="password/validate-username")
    def validate_username(self, request):
        data = self.validate(request)
        user = self.user_by_username(data["username"])

        if not user or not user.email:
            return Response({"message": "If the account exists, an OTP has been sent"})

        otp = generate_otp()
        cache.set(self.fp_key(user.username), otp, 180)
        send_otp_email.delay(to_email=user.email, otp=otp, purpose="password reset")

        return Response(
            {"message": f"OTP sent to {mask_email(user.email)}"},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"], url_path="password/validate-otp")
    def validate_otp(self, request):
        data = self.validate(request)
        username, otp = data["username"], data["otp"]

        if cache.get(self.fp_key(username)) != otp:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        cache.delete(self.fp_key(username))
        cache.set(self.fp_verified_key(username), True, 120)

        return Response({"message": "OTP verified"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="password/reset")
    def reset(self, request):
        data = self.validate(request)
        username, password = data["username"], data["password"]

        if not cache.get(self.fp_verified_key(username)):
            return Response({"error": "OTP not verified"}, status=status.HTTP_403_FORBIDDEN)

        user = self.user_by_username(username)
        if not user:
            return Response({"error": "Invalid user"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user=user)
        except DjangoValidationError as e:
            return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()
        cache.delete(self.fp_verified_key(username))

        return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="username")
    def forget_username(self, request):
        data = self.validate(request)
        user = User.objects.filter(email=data["email"]).first()

        if user:
            send_username_email.delay(to_email=data["email"], username=user.username)

        return Response(
            {"message": "If the email exists, the username has been sent"},
            status=status.HTTP_200_OK
        )
