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


import logging
import traceback

logger = logging.getLogger(__name__)

class GoogleOAuthLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response({"error": "Google code required"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            # exchange code for id_token
            payload = {
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": "postmessage",
            }
            
            token_res = requests.post(
                "https://oauth2.googleapis.com/token",
                data=payload,
                timeout=10,
            )
            
            token_data = token_res.json()

            if "id_token" not in token_data:
                logger.error(f"GOOGLE AUTH ERROR: {token_data}")
                return Response({
                    "error": "Invalid Google token",
                    "details": token_data
                }, status=status.HTTP_401_UNAUTHORIZED)

            # verify token
            info = id_token.verify_oauth2_token(
                token_data["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

            email = info["email"]
            name = info.get("name", "")

            # create or get user (more robustly)
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.filter(username=email).first()
            
            created = False
            if not user:
                from apps.employee.models import UserBusinessRole, UserRole
                from apps.employee.utils.permission_utils import sync_user_role_permissions
                user = User.objects.create(
                    email=email,
                    username=email,
                    first_name=name
                )
                # Assign OWNER role by default for self-signup
                UserBusinessRole.objects.create(user=user, role=UserRole.OWNER)
                sync_user_role_permissions(user)
                created = True
            elif not user.email:
                user.email = email
                user.save(update_fields=["email"])

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
                status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.error(f"Authentication Failed: {str(e)}\n{traceback.format_exc()}")
            return Response({
                "error": "Authentication Failed",
                "details": str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)
