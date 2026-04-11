from django.contrib import admin
from apps.subscription.models import Usage, Subscription, Plan

admin.site.register(Usage)
admin.site.register(Subscription)
admin.site.register(Plan)
