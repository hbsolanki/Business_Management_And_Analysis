import re
from rest_framework import serializers
from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChartRef
from apps.base.serializers.base import BaseSerializer



class AiChatSessionSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = AiChatSession
        fields = BaseSerializer.Meta.fields + ['title']
        read_only_fields = BaseSerializer.Meta.read_only_fields
