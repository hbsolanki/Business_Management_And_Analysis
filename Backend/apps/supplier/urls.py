from rest_framework.routers import DefaultRouter
from django.urls import path, include
from apps.supplier.views import (
    SupplierViewSet, 
    PurchaseOrderViewSet,
    SalesOrderViewSet,
)

router = DefaultRouter()
router.register('vendor', SupplierViewSet, basename='supplier')
router.register('purchase-order', PurchaseOrderViewSet, basename='purchase-order')
router.register('sales-order', SalesOrderViewSet, basename='sales-order')

urlpatterns = [
    path('', include(router.urls)),
]
