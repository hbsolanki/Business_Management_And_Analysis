from rest_framework import serializers

class ValidateUsernameSerializer(serializers.Serializer):
    username = serializers.CharField()

class ValidateOTPSerializer(serializers.Serializer):
    username = serializers.CharField()
    otp=serializers.CharField(max_length=6)

class ResetPasswordSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class ForgetUsernameSerializer(serializers.Serializer):
    email=serializers.EmailField()
