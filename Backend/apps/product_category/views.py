from rest_framework import viewsets
from .models import  ProductCategory
from apps.product_category.serializers import ProductCategorySerializer
from apps.permission.product import ProductPermission


class ProductCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [ProductPermission]
    serializer_class = ProductCategorySerializer

    def get_queryset(self):
        return ProductCategory.objects.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user,business=self.request.user.business)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
