from django.utils import timezone

from rest_framework import serializers
from apps.tasks.models import Task
from apps.user.models import User
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer


class TaskSerializer(BaseSerializer):
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(), source="assignee", write_only=True
    )
    assignee = UserBasicDetailsSerializer(read_only=True)
    assigned_by = UserBasicDetailsSerializer(read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            self.fields["assignee_id"].queryset = User.objects.filter(
                business_roles__business=request.user.business
            )

    class Meta:
        model = Task
        fields = BaseSerializer.Meta.fields + [
            "business", "branch", "assignee_id", "title", "description", 
            "assignee", "assigned_by", "status", "remarks", "completed_at", 
            "deadline"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["business", "assignee", "assigned_by", "completed_at"]

    def validate(self, attrs):
        request = self.context.get("request")

        if not self.instance:
            attrs["assigned_by"] = request.user
            attrs["business"] = request.user.business

        return attrs

    def update(self, instance, validated_data):
        request = self.context.get("request")
        
        # Enforce that only the original creator (assigned_by) can set or change the deadline
        if "deadline" in validated_data and validated_data["deadline"] != instance.deadline:
            if request and request.user != instance.assigned_by:
                raise serializers.ValidationError({"deadline": "Only the assigner (assigned_by) can set or update the deadline."})

        if "status" in validated_data and validated_data["status"] == Task.Status.COMPLETED:
            instance.completed_at = timezone.now()

        return super().update(instance, validated_data)


class TaskCreateReminderSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    content = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    remind_at = serializers.DateTimeField()
    recurrence = serializers.ChoiceField(
        choices=["NONE", "DAILY", "WEEKLY", "MONTHLY"],
        default="NONE",
        required=False,
    )

    def validate_remind_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Reminder time must be in the future.")
        return value

    def create(self, validated_data):
        task = self.context["task"]
        request = self.context["request"]

        from apps.notification.utils import create_entity_reminder
        reminder = create_entity_reminder(
            request=request,
            entity_instance=task,
            title=validated_data["title"],
            content=validated_data.get("content") or "",
            remind_at=validated_data["remind_at"],
            recurrence=validated_data.get("recurrence", "NONE"),
        )
        return reminder

    def to_representation(self, instance):
        from apps.notification.serializers import ReminderSerializer
        return ReminderSerializer(instance, context=self.context).data





