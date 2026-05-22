from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from apps.user.models import User
from apps.base.serializers.base import BaseSerializer
from apps.employee.serializers.user_branch_work import UserBranchWorkSerializer


class UserSerializer(BaseSerializer):
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.CharField(source="role_name", read_only=True)
    business_id = serializers.UUIDField(read_only=True)
    bio = serializers.CharField(source="employee_details.bio", required=False, allow_blank=True)
    assigned_works = UserBranchWorkSerializer(many=True, read_only=True, source="branch_works")

    class Meta(BaseSerializer.Meta):
        model = User
        fields = BaseSerializer.Meta.fields + [
            "first_name", "last_name", "email", "username",
            "password", "mobile_number", "profile_picture", "date_joined",
            "role", "business_id", "assigned_works", "bio",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "date_joined", "role", "business_id", "assigned_works",
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

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        bio = validated_data.pop("employee_details", {}).get("bio")
        password = validated_data.pop("password", None)

        instance = super().update(instance, validated_data)

        if bio is not None:
            from apps.employee.models import EmployeeDetails
            EmployeeDetails.objects.update_or_create(user=instance, defaults={"bio": bio})

        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])

        return instance


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
