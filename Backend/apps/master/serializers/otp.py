from rest_framework import serializers


class SendOTPSerializer(serializers.Serializer):
    """
    Generic serializer for validating an email/identifier before sending an OTP.
    It does not contain app-specific checks (e.g. checking if user exists),
    those should be handled in the respective view.
    """

    email = serializers.EmailField(
        required=True,
        error_messages={
            "required": "Email is required",
            "invalid": "Enter a valid email address",
        },
    )

    def validate_email(self, value):
        email = value.strip().lower()
        return email


class OtpValidationSerializer(serializers.Serializer):
    """
    Validates a registration payload containing a nested user object and an OTP.
    """

    user = serializers.DictField()
    otp = serializers.CharField(max_length=6)

    def validate(self, attrs):
        user_data = attrs.get("user")
        if not user_data:
            raise serializers.ValidationError({"user": "User data required"})

        email = user_data.get("email", "").strip().lower()
        if not email:
            raise serializers.ValidationError({"email": "Email is required"})

        return attrs


class ValidateOTPSerializer(serializers.Serializer):
    """
    Validates a simple generic payload containing an identifier (username/email) and an OTP.
    """

    username = serializers.CharField(max_length=150)
    otp = serializers.CharField(min_length=6, max_length=6)
