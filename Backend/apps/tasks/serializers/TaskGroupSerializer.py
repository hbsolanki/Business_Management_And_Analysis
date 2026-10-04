from rest_framework import serializers
from apps.tasks.models import TaskGroup
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.base.serializers.base import BaseSerializer
from apps.tasks.serializers.TaskGroupMemberSerializer import TaskGroupMemberSerializer


class TaskGroupSerializer(BaseSerializer):
    members = TaskGroupMemberSerializer(many=True, read_only=True)
    created_by = UserBasicDetailsSerializer(read_only=True)

    class Meta:
        model = TaskGroup
        fields = BaseSerializer.Meta.fields + ["name", "is_private", "business", "created_by", "members"]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["business", "created_by"]

    def validate_name(self, value):
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return value

        qs = TaskGroup.objects.filter(
            business=request.user.business,
            name__iexact=value,
            is_deleted=False
        )
        
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
            
        if qs.exists():
            raise serializers.ValidationError("A task group with this name already exists.")
            
        return value

    def validate(self, attrs):
        # On update: only the group creator or an OWNER-role user can make changes
        if self.instance:
            request = self.context.get("request")
            if request and hasattr(request, "user"):
                user = request.user
                is_owner_role = getattr(user, 'role_name', None) == 'OWNER'
                if not is_owner_role and self.instance.created_by != user:
                    raise serializers.ValidationError(
                        "Only the group creator or an Owner can edit this group."
                    )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
            validated_data["business"] = request.user.business
            
        task_group = super().create(validated_data)
        
        members_data = self.initial_data.get('members', [])
        if members_data:
            member_serializer = TaskGroupMemberSerializer(
                data=members_data, many=True, context=self.context
            )
            if member_serializer.is_valid(raise_exception=True):
                member_serializer.save(group=task_group)
            
        return task_group

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        
        members_data = self.initial_data.get('members')
        if members_data is not None:
            # Soft-delete existing members instead of hard-delete to preserve history
            instance.members.filter(is_deleted=False).update(is_deleted=True, is_active=False)
            if members_data:
                member_serializer = TaskGroupMemberSerializer(
                    data=members_data, many=True, context=self.context
                )
                if member_serializer.is_valid(raise_exception=True):
                    member_serializer.save(group=instance)
                
        return instance

