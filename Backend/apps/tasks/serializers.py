from django.utils import timezone

from rest_framework import serializers
from apps.tasks.models import Task
from apps.user.models import User
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


class TaskSerializer(BaseSerializer):
    assignee_id=serializers.IntegerField()
    assignee = UserBasicDetailsSerializer(read_only=True)
    assigned_by = UserBasicDetailsSerializer(read_only=True)

    class Meta:
            model = Task
            fields=BaseSerializer.Meta.fields + ["business","assignee_id","title","description","assignee","assigned_by","status","remarks","completed_at"]
            read_only_fields=BaseSerializer.Meta.fields + ["business","assignee","assigned_by","completed_at"]


    def validate(self, attrs):
        request = self.context.get("request")
        assignee_id = attrs.get("assignee_id")

        if assignee_id:
            try:
                attrs["assignee"] = User.objects.get(id=assignee_id, business_roles__business=request.user.business)
            except User.DoesNotExist:
                raise serializers.ValidationError({"assignee_id": "User not found or does not belong to your business."})
        
        if not self.instance:
            attrs["assigned_by"] = request.user
            attrs["business"] = request.user.business
        
        return attrs

    def create(self, validated_data):
        validated_data.pop("assignee_id", None)
        return super().create(validated_data)


    def update(self, instance, validated_data):
        if "status" in validated_data and validated_data["status"] == Task.Status.COMPLETED:
            instance.completed_at = timezone.now()

        return super().update(instance, validated_data)


