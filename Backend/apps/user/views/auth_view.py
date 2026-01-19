from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework import status
from django.contrib.auth import authenticate
from apps.user.serializers.login import UserLoginSerializer
from apps.user.services.user_service import get_tokens_for_user
from datetime import datetime

class LoginThrottle(AnonRateThrottle):
    rate='5/min'


class LoginView(APIView):
    permission_classes=[AllowAny]
    throttle_classes=[LoginThrottle]

    def post(self,request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        user=authenticate(username=username,password=password)
        if not user :
            return Response({"error":"Invalid Credentials"},status=status.HTTP_401_UNAUTHORIZED)

        user.last_login = datetime.now()
        user.save(update_fields=["last_login"])
        token=get_tokens_for_user(user)

        return Response({**token,"user":{"id":user.id,"username":user.username,"role":user.role}})