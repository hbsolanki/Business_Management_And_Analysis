import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bma.config.production")

django_asgi_app = get_asgi_application()

from apps.chat.middleware import JWTAuthMiddleware
from channels.routing import ProtocolTypeRouter, URLRouter

from apps.chat.routing import websocket_urlpatterns as chat_ws
from apps.activity_log.routing import websocket_urlpatterns as activity_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
                chat_ws + activity_ws
        )
    ),
})
