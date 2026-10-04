from django.contrib import admin
from apps.payment.models import (
    Payment, InvoicePayment, SubscriptionPayment,
    PaymentGatewayDetail, StripeConnectAccount, WebhookEvent,
)

admin.site.register(Payment)
admin.site.register(InvoicePayment)
admin.site.register(SubscriptionPayment)
admin.site.register(PaymentGatewayDetail)
admin.site.register(StripeConnectAccount)
admin.site.register(WebhookEvent)
