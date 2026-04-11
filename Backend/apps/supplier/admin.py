from apps.supplier.models import Supplier, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem
from django.contrib import admin

admin.site.register(Supplier)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(SalesOrder)
admin.site.register(SalesOrderItem)