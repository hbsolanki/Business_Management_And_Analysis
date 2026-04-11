from django.contrib import admin
from apps.invoice.models import ProductInvoice,Invoice

admin.site.register(Invoice)
admin.site.register(ProductInvoice)