from django.urls import path,include
from rest_framework.routers import DefaultRouter
from apps.invoice.views import invoice_view

router = DefaultRouter()
router.register('', invoice_view.InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('',include(router.urls)),
]