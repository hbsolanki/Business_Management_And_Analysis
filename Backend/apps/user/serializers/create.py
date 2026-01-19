from rest_framework import serializers
from apps.user.models import User
from .base import BaseUserSerializer


class BaseUserCreateSerializer(BaseUserSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "username",
            "mobile_number",
            "password",
            "salary",
            "description",
        ]


class ManagerCreateSerializer(BaseUserCreateSerializer):
    pass

class EmployeeCreateSerializer(BaseUserCreateSerializer):
    work = serializers.ChoiceField(
        choices=User.Work.choices,
        required=False,
        allow_null=True,
    )

    class Meta(BaseUserCreateSerializer.Meta):
        fields = BaseUserCreateSerializer.Meta.fields + ["work"]
