from django.urls import re_path
from .consumers import AiAgentConsumer

websocket_urlpatterns = [
    re_path(r"^ws/ai-agent/sessions/(?P<session_id>[a-f0-9-]+)/?$", AiAgentConsumer.as_asgi()),
]
