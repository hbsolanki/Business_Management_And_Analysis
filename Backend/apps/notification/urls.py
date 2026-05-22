from rest_framework.routers import DefaultRouter
from apps.notification.views import NotificationViewSet, ReminderViewSet, EntityReminderViewSet

router = DefaultRouter()
router.register("reminders", ReminderViewSet, basename="reminder")
router.register("entity-reminders", EntityReminderViewSet, basename="entity-reminder")
router.register("", NotificationViewSet, basename="notification")

urlpatterns = router.urls