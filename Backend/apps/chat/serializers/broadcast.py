from rest_framework import serializers
from apps.chat.models import BroadcastGroup,BroadcastGroupMember
from django.db import transaction
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.user.models import User

class MessageBroadcastUserSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    def validate_user_id(self, value):
        request_user = self.context["request"].user
        if not value.is_active:
            raise serializers.ValidationError("User is not active")
        if value.business_id != request_user.business_id:
            raise serializers.ValidationError("User does not belong to your business")
        return value

class MessageBroadcastSerializer(serializers.Serializer):
    message = serializers.CharField()
    users = MessageBroadcastUserSerializer(many=True)

    def validate_users(self, value):
        if not value:
            raise serializers.ValidationError("At least one user is required")
        return value

class BroadcastGroupMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user_member",
        write_only=True
    )
    user = UserBasicDetailsSerializer(read_only=True, source="user_member")

    class Meta:
        model = BroadcastGroupMember
        fields = ["user_id", "user"]
        read_only_fields = ["user"]

    def validate_user_id(self, value):
        request_user = self.context["request"].user
        if not value.is_active:
            raise serializers.ValidationError("User is not active")
        if value.business_id != request_user.business_id:
            raise serializers.ValidationError("User does not belong to your business")
        return value

class BroadcastGroupSerializer(serializers.ModelSerializer):
    users = BroadcastGroupMemberSerializer(
        source="broadcast_group_members",
        many=True
    )

    class Meta:
        model = BroadcastGroup
        fields = ["id", "name", "users"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        request_user = self.context["request"].user
        users_data = validated_data.pop("broadcast_group_members", [])

        with transaction.atomic():
            group = BroadcastGroup.objects.create(user=request_user, **validated_data)

            members_data = [{'user_id': item['user_member'].id} for item in users_data]
            member_serializer = BroadcastGroupMemberSerializer(
                data=members_data,
                many=True,
                context=self.context
            )
            member_serializer.is_valid(raise_exception=True)
            member_serializer.save(broadcast_group=group)

        return group

    def update(self, instance, validated_data):
        users_data = validated_data.pop("broadcast_group_members", None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.save()

        if users_data is not None:
            with transaction.atomic():
                instance.broadcast_group_members.all().delete()
                
                members_data = [{'user_id': item['user_member'].id} for item in users_data]
                member_serializer = BroadcastGroupMemberSerializer(
                    data=members_data,
                    many=True,
                    context=self.context
                )
                member_serializer.is_valid(raise_exception=True)
                member_serializer.save(broadcast_group=instance)

        return instance
