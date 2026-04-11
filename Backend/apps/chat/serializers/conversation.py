from apps.master.serializers.user import UserBasicDetailsSerializer
from rest_framework import serializers
from apps.user.models import User
from apps.chat.models import Conversation


class ConversationGetOrCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(write_only=True)

    def validate_user_id(self, value):
        request = self.context["request"]

        if value == request.user.id:
            raise serializers.ValidationError("Cannot chat with yourself")

        try:
            self.other_user = User.objects.get(id=value,is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found or User is Inactive")

        return value

    def create(self, validated_data):
        request = self.context["request"]
        user1, user2 = request.user, self.other_user

        if user1.id > user2.id:
            user1, user2 = user2, user1

        conversation, created = Conversation.objects.get_or_create(
            user1=user1,
            user2=user2
        )

        return conversation


class ConversationReadSerializer(serializers.ModelSerializer):
    user1 = UserBasicDetailsSerializer(read_only=True)
    user2 = UserBasicDetailsSerializer(read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'created_at', 'user1', 'user2']
