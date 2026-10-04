from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from apps.user.models import User
from apps.base.serializers.base import BaseSerializer


class UserSerializer(BaseSerializer):
    resource_limit_field = "max_staff"
    password = serializers.CharField(write_only=True, required=False)

    class Meta(BaseSerializer.Meta):
        model = User
        fields = BaseSerializer.Meta.fields + [
            "first_name",
            "last_name",
            "email",
            "username",
            "password",
            "mobile_number",
            "profile_picture",
            "date_joined",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "date_joined",
        ]

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required")
        value = value.lower()
        qs = User.all_objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def validate_username(self, value):
        qs = User.all_objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

    def validate_profile_picture(self, value):
        max_size = 5 * 1024 * 1024  # 5MB
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if value.size > max_size:
            raise serializers.ValidationError("Profile picture must be under 5MB.")
        if hasattr(value, "content_type") and value.content_type not in allowed_types:
            raise serializers.ValidationError("Only JPEG, PNG, and WebP images are allowed.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

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
