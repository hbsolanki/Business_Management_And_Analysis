from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from apps.user.models import User
from apps.base.serializers.base import BaseSerializer

class UserSerializer(BaseSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = BaseSerializer.Meta.fields + [
            "first_name", "last_name", "email", "username",
            "password", "mobile_number", "profile_picture", "date_joined"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["date_joined"]

    def validate_username(self, value):
        queryset = User.all_objects.filter(username=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_mobile_number(self, value):
        super().validate_mobile_number(value)
        queryset = User.all_objects.filter(mobile_number=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Mobile number already exists")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)

        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])

        return instance


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)



