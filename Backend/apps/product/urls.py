from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.product.views import (ProductViewSet)
from apps.product_category.views import ProductCategoryViewSet

router = DefaultRouter()

router.register(r'category', ProductCategoryViewSet, basename='product-category')
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]
