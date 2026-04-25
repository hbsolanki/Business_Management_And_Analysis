from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from apps.user.models import User
from apps.base.serializers.base import BaseSerializer

class UserSerializer(BaseSerializer):
    password = serializers.CharField(write_only=True)

    role = serializers.CharField(source="role_name", read_only=True)
    business_id = serializers.UUIDField(read_only=True)
    assigned_works = serializers.ListField(child=serializers.CharField(), read_only=True, source="assigned_works_list")

    class Meta:
        model = User
        fields = BaseSerializer.Meta.fields + [
            "first_name", "last_name", "email", "username",
            "password", "mobile_number", "profile_picture", "date_joined",
            "role", "business_id", "assigned_works"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["date_joined", "role", "business_id", "assigned_works"]

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required")
        queryset = User.all_objects.filter(email=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def validate_username(self, value):
        queryset = User.all_objects.filter(username=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Username already exists")
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



