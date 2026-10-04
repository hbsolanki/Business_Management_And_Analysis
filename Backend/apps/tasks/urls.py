from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tasks.views import TaskViewSet, TaskGroupViewSet

router = DefaultRouter()
router.register(r'groups', TaskGroupViewSet, basename='task-groups')
router.register(r'', TaskViewSet, basename='tasks')

urlpatterns =router.urls
