from django.contrib import admin
from apps.ai_agent.models import AiChatSession,AiChatMessage

admin.site.register(AiChatSession)
admin.site.register(AiChatMessage)