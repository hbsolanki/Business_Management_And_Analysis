from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from apps.user.models import User


class BaseUserSerializer(serializers.ModelSerializer):
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")

        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def validate_mobile_number(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError(
                "Mobile number must be exactly 10 digits"
            )

        if User.objects.filter(mobile_number=value).exists():
            raise serializers.ValidationError("Mobile number already exists")

        return value

    class Meta:
        model = User