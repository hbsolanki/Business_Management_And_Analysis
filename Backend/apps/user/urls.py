from django.urls import path,include
from rest_framework.routers import DefaultRouter
from apps.user.views.auth_view import LoginView
from apps.user.views.user_view import  UserViewSet
from apps.user.views.google_auth import GoogleOAuthLoginAPIView
from apps.user.views.forget_view import ForgetViewSet

router = DefaultRouter()
router.register('forget',ForgetViewSet,basename='forget')
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path("auth/google/",GoogleOAuthLoginAPIView.as_view(),name='google_oauth'),
    path('', include(router.urls)),
]