from rest_framework import serializers
from apps.tasks.models import  TaskGroup,TaskAssignment
from apps.user.models import User
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer
from apps.tasks.serializers.TaskGroupSerializer import TaskGroupSerializer


class TaskAssignmentSerializer(BaseSerializer):
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        write_only=True
    )
    assignee_group_id = serializers.PrimaryKeyRelatedField(
        queryset=TaskGroup.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        write_only=True
    )
    assignee = UserBasicDetailsSerializer(source='user_assignee', read_only=True)
    assignee_group = TaskGroupSerializer(source='group_assignee', read_only=True)

    class Meta:
        model = TaskAssignment
        fields = ['id', 'assignee_id', 'assignee_group_id', 'assignee', 'assignee_group']

    def validate_assignee_id(self, value):
        if not value:
            return value
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if not value.business_roles.filter(business=request.user.business).exists():
                raise serializers.ValidationError("You can only assign tasks to users within your business.")
        return value

    def validate_assignee_group_id(self, value):
        if not value:
            return value
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if value.business != request.user.business:
                raise serializers.ValidationError("Group must belong to your business.")
            if value.is_private and value.created_by != request.user:
                raise serializers.ValidationError("You can only assign tasks to private groups you created.")
        return value

    def validate(self, attrs):
        assignee_id = attrs.get('assignee_id')
        assignee_group_id = attrs.get('assignee_group_id')
        if not assignee_id and not assignee_group_id:
            raise serializers.ValidationError("Either assignee_id or assignee_group_id must be provided.")
        if assignee_id and assignee_group_id:
            raise serializers.ValidationError("Cannot provide both assignee and assignee_group.")
        return attrs

    def validate_task(self, value):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if value.assigned_by != request.user:
                raise serializers.ValidationError("You can only assign tasks that you created.")
        return value

    def create(self, validated_data):
        task = validated_data.get('task')
        assignee_id = validated_data.get('assignee_id')
        assignee_group_id = validated_data.get('assignee_group_id')
        
        assignee = assignee_id if assignee_id else assignee_group_id

        task.assignments.all().delete()
        assignment = TaskAssignment.objects.create(task=task, assignee=assignee)
        return assignment

