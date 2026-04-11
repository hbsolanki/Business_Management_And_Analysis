import uuid
from django.db import models

from apps.base.models import BaseModel
from apps.user.models import User


class AiChatMessageSenderChoices(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"


class AiAgentMessageWorkflowTypeChoices(models.TextChoices):
    STATUS = "status", "Status"
    TOOL_OUTPUT = "tool_output", "Tool Output"


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


class AiAgentMessageWorkflow(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        AiChatMessage,
        on_delete=models.CASCADE,
        related_name="workflow_steps"
    )
    type = models.CharField(
        max_length=50,
        choices=AiAgentMessageWorkflowTypeChoices.choices
    )
    data = models.JSONField() # Store the full payload

    class Meta:
        db_table = 'bma_ai_agent_message_workflow'
        indexes = [
            models.Index(fields=['message', 'created_at']),
        ]
        ordering = ['created_at']
        