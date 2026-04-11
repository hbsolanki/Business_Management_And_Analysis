from django.urls import path,include
from apps.chat.views import conversation,message,broadcast
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("message", message.MessagesViewSet, basename="messages")
router.register("broadcast", broadcast.BroadcastViewSet, basename="broadcast")
router.register("conversation",conversation.ConversationViewSet, basename="conversation")

urlpatterns = [
    path('', include(router.urls)),
]
