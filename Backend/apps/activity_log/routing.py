from django.urls import re_path
from .consumers import ActivityLogConsumer

websocket_urlpatterns = [
    re_path(r"^ws/activity_log/?$", ActivityLogConsumer.as_asgi()),
]
