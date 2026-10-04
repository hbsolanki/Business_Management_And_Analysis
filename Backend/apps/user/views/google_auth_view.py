import logging
import uuid

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from apps.user.utils.token import get_tokens_for_user
from apps.activity_log.models import ActivityLog

User = get_user_model()
logger = logging.getLogger(__name__)


class GoogleOAuthThrottle(AnonRateThrottle):
    rate = '5/min'


class GoogleOAuthLoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [GoogleOAuthThrottle]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response(
                {"error": "Google code required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Exchange code
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
            )
            token_data = token_res.json()

            if "id_token" not in token_data:
                logger.error("Google token exchange failed: %s", token_data)
                return Response(
                    {"error": "Invalid Google token"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Verify token
            info = id_token.verify_oauth2_token(
                token_data["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

            email = info["email"].lower()
            name = info.get("name", "")

            # Block existing
            if User.objects.filter(email__iexact=email).exists():
                return Response(
                    {"error": "A user with this email already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Unique username
            while True:
                username = f"user_{uuid.uuid4().hex[:10]}"
                if not User.objects.filter(username=username).exists():
                    break

            # Create owner
            password = User.objects.make_random_password(length=14)
            serializer = OwnerSerializer(
                data={
                    "user": {
                        "email": email,
                        "username": username,
                        "first_name": name,
                        "password": password,
                    }
                }
            )
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

            # Activity log
            ActivityLog.objects.log(
                business=user.business,
                actor=user,
                action=ActivityLog.Action.LOGIN,
                module=ActivityLog.Module.USER,
                message=f"User {user.username} registered via Google OAuth",
            )

            # Return tokens
            return Response(
                get_tokens_for_user(user),
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.exception("Google OAuth login failed: %s", str(e))
            return Response(
                {"error": "Authentication failed. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
