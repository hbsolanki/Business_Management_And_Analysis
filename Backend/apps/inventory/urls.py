from rest_framework.routers import DefaultRouter
from apps.inventory.views import InventoryProductViewSet,InventoryTransactionViewSet

router = DefaultRouter()
router.register("stock",InventoryProductViewSet, basename="inventoryproduct")
router.register("transaction", InventoryTransactionViewSet, basename="inventorytransaction")

urlpatterns = router.urls