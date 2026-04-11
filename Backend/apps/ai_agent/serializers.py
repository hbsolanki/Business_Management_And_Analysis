from apps.ai_agent.models import AiChatSession, AiChatMessage, AiAgentMessageWorkflow
from apps.base.serializers.base import BaseSerializer


class AiAgentMessageWorkflowSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = AiAgentMessageWorkflow
        fields = BaseSerializer.Meta.fields + ['type', 'data']
        read_only_fields = BaseSerializer.Meta.read_only_fields


class AiChatSessionSerializer(BaseSerializer):

    class Meta(BaseSerializer.Meta):
        model = AiChatSession
        fields = BaseSerializer.Meta.fields + ['title']
        read_only_fields = BaseSerializer.Meta.read_only_fields


class AiChatMessageSerializer(BaseSerializer):
    workflow_steps = AiAgentMessageWorkflowSerializer(many=True, read_only=True)

    class Meta(BaseSerializer.Meta):
        model = AiChatMessage
        fields = BaseSerializer.Meta.fields + ['sender', 'content', 'embedding', 'workflow_steps']
        read_only_fields = BaseSerializer.Meta.read_only_fields + ['sender']
        