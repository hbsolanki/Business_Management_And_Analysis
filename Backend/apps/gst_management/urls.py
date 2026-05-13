from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.gst_management.views import MonthlyGSTSummaryViewSet

router = DefaultRouter()
router.register(r'summaries', MonthlyGSTSummaryViewSet, basename='gst-summary')

urlpatterns = [
    path('', include(router.urls)),
]
