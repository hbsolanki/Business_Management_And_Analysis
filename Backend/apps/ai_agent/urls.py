from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.ai_agent.views import AiChatSessionViewSet

router = DefaultRouter()
router.register(r'sessions', AiChatSessionViewSet, basename='ai-chat-session')

urlpatterns = [
    path('', include(router.urls)),
]
