import logging

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google.auth.exceptions import GoogleAuthError

from apps.activity_log.models import ActivityLog
from apps.employee.models import UserBusinessRole, UserRole
from apps.employee.utils.permission_utils import sync_user_role_permissions

User = get_user_model()
logger = logging.getLogger(__name__)


class GoogleOAuthLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response({"error": "Google code required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Exchange authorization code for tokens
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
                return Response({"error": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

            # Verify the ID token with Google
            info = id_token.verify_oauth2_token(
                token_data["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

            email = info["email"].lower()
            name = info.get("name", "")

            # Resolve or create the user
            from django.db.models import Q
            user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()

            created = False
            if not user:
                user = User.objects.create(email=email, username=email, first_name=name)
                UserBusinessRole.objects.create(user=user, role=UserRole.OWNER)
                sync_user_role_permissions(user)
                created = True
            elif not user.email:
                user.email = email
                user.save(update_fields=["email"])

            refresh = RefreshToken.for_user(user)

            ActivityLog.objects.log(
                business=request.user.business,
                actor=user,
                action=ActivityLog.Action.LOGIN,
                module=ActivityLog.Module.USER,
                message=f"User {user.username} logged in via Google",
            )

            return Response(
                {
                    "business_id": request.user.business_id,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "role": request.user.role_name,
                    },
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        except requests.exceptions.Timeout:
            logger.error("Google token exchange request timed out")
            return Response(
                {"error": "Google authentication service timed out. Please try again later."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except requests.exceptions.RequestException as exc:
            logger.error("Google token exchange request failed: %s", exc)
            return Response(
                {"error": "Could not reach Google authentication service."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as exc:
            logger.error("Failed to parse response JSON from Google: %s", exc)
            return Response(
                {"error": "Invalid response format from Google authentication service."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except GoogleAuthError as exc:
            logger.error("Google ID token verification failed: %s", exc)
            return Response(
                {"error": "Invalid or expired Google authentication token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except IntegrityError:
            logger.exception("Database integrity error during Google OAuth signup")
            return Response(
                {"error": "A database conflict occurred during user registration. Please try again."},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception:
            logger.exception("Unexpected error during Google OAuth login")
            return Response(
                {"error": "An unexpected authentication error occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
