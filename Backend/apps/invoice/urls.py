from django.urls import path,include
from rest_framework.routers import DefaultRouter
from apps.invoice.views import invoice_view, stripe_payment_view

router = DefaultRouter()
router.register(r'payment', stripe_payment_view.PaymentViewSet, basename='invoice-payment')
router.register('', invoice_view.InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('',include(router.urls)),
]