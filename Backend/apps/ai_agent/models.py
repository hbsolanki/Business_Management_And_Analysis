import uuid
from django.db import models

from apps.base.models import BaseModel
from apps.user.models import User


class AiChatMessageSenderChoices(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"


class AiChatSession(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'bma_ai_chat_session'
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]


class AiChatMessage(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    sender = models.CharField(
        max_length=10,
        choices=AiChatMessageSenderChoices.choices
    )

    session = models.ForeignKey(
        AiChatSession,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    content = models.TextField()
    embedding = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'bma_ai_chat_message'
        indexes = [
            models.Index(fields=['session', 'created_at']),
        ]
        ordering = ['created_at']


class AiChartRef(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        AiChatMessage,
        on_delete=models.CASCADE,
        related_name="chart_refs",
        null=True,
        blank=True
    )
    html = models.TextField()

    class Meta:
        db_table = 'bma_ai_chart_ref'
        indexes = [
            models.Index(fields=['message', 'created_at']),
        ]
        ordering = ['created_at']