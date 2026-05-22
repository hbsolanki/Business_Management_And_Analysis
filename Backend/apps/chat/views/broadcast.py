from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from django.db import transaction

from apps.chat.serializers.broadcast import BroadcastGroupSerializer,MessageBroadcastSerializer
from apps.chat.models import BroadcastGroup,Conversation,Message
from apps.base.permission.model_permissions import ModelPermissions
from apps.subscription.permissions import ChatFeaturePermission


from apps.chat.serializers.message import MessageSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.notification.utils import send_notification
from apps.notification.models import Notification


class BroadcastViewSet(ModelViewSet):
    permission_classes = [ModelPermissions,ChatFeaturePermission]
    queryset = BroadcastGroup.objects.all()

    def get_queryset(self):
        user = self.request.user
        return BroadcastGroup.objects.filter(user=user)

    def get_serializer_class(self):

        if self.action == "message_broadcast":
            return MessageBroadcastSerializer

        return BroadcastGroupSerializer

    @action(detail=False, methods=["post"], url_path=r"message")
    @transaction.atomic
    def message_broadcast(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        channel_layer = get_channel_layer()
        
        for user_data in data["users"]:
            user2 = user_data["user_id"]
            user1 = request.user
            
            u1, u2 = (user1, user2) if user1.id < user2.id else (user2, user1)

            conversation, created = Conversation.objects.get_or_create(user1=u1, user2=u2)

            message = Message.objects.create(
                conversation=conversation, 
                sender=user1, 
                text=data["message"],
                message_type=Message.MessageType.TEXT
            )
            
            if channel_layer:
                message_data = MessageSerializer(message).data
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conversation.id}",
                    {
                        "type": "chat.message",
                        "data": message_data
                    }
                )

            # Send System Notification
            send_notification(
                user=user2,
                actor=user1,
                title=f"New Broadcast from {user1.username}",
                content=data["message"],
                action_type=Notification.ActionType.MESSAGE_BROADCAST,
                action_link=f"/chat/{conversation.id}/"
            )

        return Response({"message": f"Message broadcasted to {len(data['users'])} users"}, status=status.HTTP_200_OK)
