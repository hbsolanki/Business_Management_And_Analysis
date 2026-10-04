from django.utils import timezone
from rest_framework import serializers
from apps.tasks.models import Task
from apps.user.models import User
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer
from apps.tasks.serializers.TaskGroupSerializer import TaskGroupSerializer
from apps.tasks.serializers.TaskAssignmentSerializer import TaskAssignmentSerializer


class TaskSerializer(BaseSerializer):
    assigned_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True, required=False, allow_null=True
    )
    assigned_by = UserBasicDetailsSerializer(read_only=True)
    task_assignment = TaskAssignmentSerializer(required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = BaseSerializer.Meta.fields + [
            "business", "branch", "assigned_by_id", "title", "description", "assigned_by", "status", "remarks", "completed_at", "deadline", "task_assignment"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["business", "assigned_by", "completed_at"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Remove task_assignment if it got populated somehow
        ret.pop('task_assignment', None)
        
        assignment = instance.assignments.first()
        if assignment:
            if assignment.assignee_type.model == 'user':
                ret['assignee'] = UserBasicDetailsSerializer(assignment.assignee).data
                ret['assignee_group'] = None
            elif assignment.assignee_type.model == 'taskgroup':
                ret['assignee'] = None
                ret['assignee_group'] = TaskGroupSerializer(assignment.assignee).data
        else:
            ret['assignee'] = None
            ret['assignee_group'] = None
        return ret

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.method == "POST":
            if "task_assignment" not in self.initial_data:
                raise serializers.ValidationError({"task_assignment": "Task assignment is required."})
        return attrs

    def validate_deadline(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Deadline must be set in the future.")
        return value

    def create(self, validated_data):
        task_assignment_data = validated_data.pop("task_assignment", None)
        request = self.context.get("request")

        if request and hasattr(request, "user"):
            validated_data["assigned_by"] = request.user
            validated_data["business"] = request.user.business

        task = super().create(validated_data)
        
        if task_assignment_data:
            task_assignment_data['task'] = task
            self.fields['task_assignment'].create(task_assignment_data)
            
        return task

    def update(self, instance, validated_data):
        task_assignment_data = validated_data.pop("task_assignment", None)
        
        request = self.context.get("request")
        
        # Enforce that only the original creator (assigned_by) can set or change the deadline
        if "deadline" in validated_data and validated_data["deadline"] != instance.deadline:
            if request and request.user != instance.assigned_by:
                raise serializers.ValidationError({"deadline": "Only the assigner (assigned_by) can set or update the deadline."})

        if "status" in validated_data:
            if validated_data["status"] == Task.Status.COMPLETED:
                instance.completed_at = timezone.now()
            elif validated_data["status"] != Task.Status.COMPLETED:
                instance.completed_at = None

        task = super().update(instance, validated_data)
        
        if task_assignment_data:
            task_assignment_data['task'] = task
            self.fields['task_assignment'].create(task_assignment_data)
                
        return task

