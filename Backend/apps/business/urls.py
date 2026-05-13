from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.business.views import BusinessViewSet, BranchViewSet, BusinessCustomerViewSet, BusinessGSTProfileViewSet

router = DefaultRouter()
router.register('branch', BranchViewSet, basename='branch')
router.register('customer', BusinessCustomerViewSet, basename='business-customer')
router.register('gst-profile', BusinessGSTProfileViewSet, basename='business-gst-profile')
router.register(r'', BusinessViewSet, basename='business')

urlpatterns = [
    path('', include(router.urls)),
]