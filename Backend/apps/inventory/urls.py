from rest_framework.routers import DefaultRouter
from apps.inventory.views.inventory_view import InventoryViewSet
from django.urls import path,include

router = DefaultRouter()
router.register("", InventoryViewSet, basename="inventory")

urlpatterns = [
    path('', include(router.urls)),
]