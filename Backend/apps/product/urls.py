from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.product.views import product_view,product_category_view

router = DefaultRouter()

router.register(r'category', product_category_view.ProductCategoryViewSet, basename='product-category')
router.register(r'', product_view.ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]
