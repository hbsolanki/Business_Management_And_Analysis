from django.contrib import admin
from apps.subscription.models import Usage, Subscription, Plan, SubscriptionWebhookEvent

admin.site.register(Usage)
admin.site.register(Subscription)
admin.site.register(Plan)
admin.site.register(SubscriptionWebhookEvent)
