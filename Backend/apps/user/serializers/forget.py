from rest_framework import serializers


class ValidateUsernameSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)


class ValidateOTPSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    otp = serializers.CharField(min_length=6, max_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)


class ForgetUsernameSerializer(serializers.Serializer):
    email = serializers.EmailField()
