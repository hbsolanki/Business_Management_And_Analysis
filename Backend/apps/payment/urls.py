from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.payment.views import (
    PaymentViewSet,
    InvoicePaymentViewSet,
    SubscriptionPaymentViewSet,
    StripeConnectViewSet,
)

router = DefaultRouter(trailing_slash=False)

router.register(r"invoice", InvoicePaymentViewSet, basename="invoice-payment")
router.register(r"subscription", SubscriptionPaymentViewSet, basename="subscription-payment")
router.register(r"connect", StripeConnectViewSet, basename="stripe-connect")
router.register(r"", PaymentViewSet, basename="payment")

urlpatterns = [
    path("", include(router.urls)),
]
