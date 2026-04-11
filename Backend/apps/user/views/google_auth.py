import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from apps.business.models import Business

User = get_user_model()

from apps.employee.models import UserRole


class GoogleOAuthLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response({"error": "Google code required"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            # exchange code for id_token
            token_res = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "redirect_uri": "postmessage",
                },
                timeout=10,
            ).json()

            if "id_token" not in token_res:
                return Response({"error": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

            # verify token
            info = id_token.verify_oauth2_token(
                token_res["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

            email = info["email"]
            name = info.get("name", "")

            # create or get user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": name,
                },
            )

            # create business if first login
            if created or not user.business_id:
                if not user.business_id:
                    user.business = Business.objects.create()
                    user.save(update_fields=["business"])
                
                from apps.employee.models import UserBusinessRole
                UserBusinessRole.objects.get_or_create(
                    user=user,
                    business=user.business,
                    role=UserRole.OWNER
                )

            # generate jwt
            refresh = RefreshToken.for_user(user)

            # Log activity
            from apps.activity_log.models import ActivityLog
            ActivityLog.objects.log(
                business=user.business,
                actor=user,
                action=ActivityLog.Action.LOGIN,
                module=ActivityLog.Module.USER,
                message=f"User {user.username} logged in via Google"
            )

            return Response(
                {
                    "business_id": user.business_id,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "role": user.role_name,
                    },
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception:
            return Response({"error": "Authentication Failed"}, status=status.HTTP_401_UNAUTHORIZED)
