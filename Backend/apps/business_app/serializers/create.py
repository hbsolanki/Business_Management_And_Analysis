from rest_framework import serializers
from apps.business_app.models import Business
from apps.user.models import User
from apps.user.serializers.base import BaseUserSerializer


class CreateBusinessSerializer(BaseUserSerializer):
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=True)
    first_name = serializers.CharField(max_length=150,required=True)
    last_name = serializers.CharField(max_length=150,required=True)
    username = serializers.CharField(max_length=150,required=True)
    password = serializers.CharField(write_only=True,required=True)
    mobile_number = serializers.CharField()

    class Meta:
        model = Business
        fields=['name','description','first_name','last_name','username','password','mobile_number']
