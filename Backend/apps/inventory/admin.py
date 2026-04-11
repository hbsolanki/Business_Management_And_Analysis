from django.contrib import admin
from apps.inventory.models import Inventory,InventoryTransaction,InventoryTransactionItem,InventoryProduct

admin.site.register(Inventory)
admin.site.register(InventoryTransaction)
admin.site.register(InventoryTransactionItem)
admin.site.register(InventoryProduct)
