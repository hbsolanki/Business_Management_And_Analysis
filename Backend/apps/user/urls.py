from django.urls import path,include
from rest_framework.routers import DefaultRouter
from apps.user.views.auth_view import LoginView
from apps.user.views.user_view import  UserViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('', include(router.urls)),
]