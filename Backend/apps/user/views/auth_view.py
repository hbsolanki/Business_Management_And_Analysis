from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework import status
from django.contrib.auth import authenticate
from django.utils import timezone
from apps.user.serializers.user import UserLoginSerializer
from apps.user.utils.token import get_tokens_for_user
from apps.activity_log.models import ActivityLog
     

class LoginThrottle(AnonRateThrottle):
    rate='5/min'


class LoginView(GenericAPIView):
    permission_classes=[AllowAny]
    throttle_classes=[LoginThrottle]
    serializer_class=UserLoginSerializer

    def post(self,request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        user=authenticate(username=username,password=password)
        if not user :
            return Response({"error":"Invalid Credentials"},status=status.HTTP_401_UNAUTHORIZED)

        # if user.last_login is not None:
        #     return Response({"error": "User is already logged in"}, status=status.HTTP_409_CONFLICT)

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        
        # Log activity
        ActivityLog.objects.log(
            business=user.business,
            actor=user,
            action=ActivityLog.Action.LOGIN,
            module=ActivityLog.Module.USER,
            message=f"User {user.username} logged in"
        )
        
        token=get_tokens_for_user(user)

        return Response(
            {**token, "user": {"id": user.id}},
            status=status.HTTP_200_OK
        )
