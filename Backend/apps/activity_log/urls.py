from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.activity_log.views import ActivityLogViewSet

router = DefaultRouter()
router.register(r'', ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    path('', include(router.urls)),
]
