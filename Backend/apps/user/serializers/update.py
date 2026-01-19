from rest_framework import serializers
from apps.user.models import User
from .base import BaseUserSerializer


class UserUpdateSerializer(BaseUserSerializer):
    password=serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields= ["first_name", "last_name", "email", "username", "mobile_number", "password","profile_picture","description"]


class OwnerUpdateSerializer(BaseUserSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields= ["first_name", "last_name", "email", "username", "mobile_number", "password","profile_picture","description","role"]
