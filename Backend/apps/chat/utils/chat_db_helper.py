from channels.db import database_sync_to_async
from django.db import models
from apps.chat.models import Conversation, Message


@database_sync_to_async
def is_conversation_member(user_id, conversation_id):
    return Conversation.objects.filter(
        id=conversation_id
    ).filter(
        models.Q(user1_id=user_id) |
        models.Q(user2_id=user_id)
    ).exists()


@database_sync_to_async
def create_message(sender_id, conversation_id, text):
    return Message.objects.create(
        sender_id=sender_id,
        conversation_id=conversation_id,
        text=text,
        message_type=Message.MessageType.TEXT
    )


@database_sync_to_async
def get_conversation_user_ids(conversation_id):
    conv = Conversation.objects.only("user1_id", "user2_id").get(id=conversation_id)
    return [conv.user1_id, conv.user2_id]
