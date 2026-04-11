from apps.notification.views import NotificationViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('', NotificationViewSet, basename='notification')

urlpatterns = router.urls