from rest_framework import serializers
from apps.tasks.models import TaskGroupMember
from apps.user.models import User
from apps.master.serializers.user import UserBasicDetailsSerializer


class TaskGroupMemberSerializer(serializers.ModelSerializer):
    user = UserBasicDetailsSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source="user",
        write_only=True
    )

    class Meta:
        model = TaskGroupMember
        fields = ["id", "group", "user", "user_id"]
        read_only_fields = ["id", "group", "user"]

    def validate_user_id(self, value):
        """Ensure the user being added belongs to the same business as the group."""
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if not value.business_roles.filter(business=request.user.business).exists():
                raise serializers.ValidationError(
                    f"User '{value.username}' does not belong to your business."
                )
        return value
