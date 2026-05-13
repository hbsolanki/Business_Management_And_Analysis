from apps.base.models import BaseModel
from django.db import models
from apps.user.models import User
from apps.chat.utils.file_type import detect_message_type
import uuid

class MessageManager(models.Manager):
    def create_message(self, conversation, sender, text=None, media=None):
        message_type = self.model.MessageType.TEXT
        
        if media:
            # Detect type for media
            type_str = detect_message_type(media)
            if type_str == "IMAGE":
                message_type = self.model.MessageType.IMAGE
            elif type_str == "VIDEO":
                message_type = self.model.MessageType.VIDEO
            else:
                message_type = self.model.MessageType.FILE
                
            if hasattr(media, 'seek'):
                media.seek(0)

        message = self.create(
            conversation=conversation,
            sender=sender,
            text=text,
            media=media,
            message_type=message_type
        )
        return message

class Conversation(BaseModel):
    user1 = models.ForeignKey(User,on_delete=models.CASCADE,related_name='conversation_user1')
    user2 = models.ForeignKey(User,on_delete=models.CASCADE,related_name='conversation_user2')

    class Meta:
        db_table = 'bma_conversation'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user1', 'user2']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user1", "user2"],
                condition=models.Q(is_deleted=False),
                name="unique_active_conversation_users"
            ),
            models.CheckConstraint(
                check=~models.Q(user1=models.F('user2')),
                name="prevent_self_conversation"
            )
        ]


def message_media_path(instance, filename):
    ext = filename.split('.')[-1]
    return f"bma/chat/conversation_{instance.conversation_id}/{uuid.uuid4()}.{ext}"


class Message(BaseModel):
    
    objects = MessageManager()

    class MessageType(models.TextChoices):
        TEXT = "TEXT", "Text"
        IMAGE = "IMAGE", "Image"
        VIDEO = "VIDEO", "Video"
        FILE = "FILE", "File"

    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='conversation_messages'
    )

    # text message
    text = models.TextField(blank=True, null=True)

    # attachment
    from apps.chat.services.s3_storage import MessageMediaS3Storage
    media = models.FileField(upload_to=message_media_path, null=True, blank=True, storage=MessageMediaS3Storage())
    message_type = models.CharField(max_length=10, choices=MessageType.choices,null=True,blank=True)

    is_updated = models.BooleanField(default=False)
    deleted_text = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'bma_message'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
        ]


class BroadcastGroup(BaseModel):
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='conversation_broadcast_group')
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'bma_broadcast_group'
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_broadcast_group_name_per_user')
        ]

class BroadcastGroupMember(BaseModel):
    user_member = models.ForeignKey(User,on_delete=models.CASCADE,related_name='conversation_broadcast_group_member')
    broadcast_group = models.ForeignKey(BroadcastGroup,on_delete=models.CASCADE,related_name='broadcast_group_members')

    class Meta:
        db_table = 'bma_broadcast_group_member'
        constraints = [
            models.UniqueConstraint(fields=['user_member', 'broadcast_group'], name='unique_broadcast_group_member')
        ]
