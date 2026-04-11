from rest_framework.routers import DefaultRouter
from django.urls import path, include
from apps.tasks.views import TaskViewSet

router = DefaultRouter()
router.register('', TaskViewSet,basename='tasks')

urlpatterns =router.urls
