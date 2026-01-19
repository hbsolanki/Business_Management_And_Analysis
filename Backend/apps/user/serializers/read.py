from rest_framework import serializers
from apps.user.models import User
from apps.business_app.serializers import read

class UserReadSerializer(serializers.ModelSerializer):

    business = read.BusinessReadSerializer()
    class Meta:
        model = User
        fields= ['id',"first_name", "last_name", "email","profile_picture", "username", "mobile_number","business", "description","work","role","date_joined","created_by","updated_by","updated_at"]


class OwnerUserReadSerializer(serializers.ModelSerializer):
    business = read.OnwerBusinessReadSerializer()

    class Meta:
        model = User
        fields= ['id',"first_name", "last_name", "email", "profile_picture","username", "mobile_number","business", "role","work","date_joined","created_by","updated_by","updated_at"]


class UserNormalDetailsReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields=["id","first_name","last_name","profile_picture","username","business"]