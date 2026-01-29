from rest_framework import viewsets

from apps.cost_category.models import CostCategory
from apps.cost_category.serializers.cost_category import CostCategorySerializer
from rest_framework.permissions import IsAuthenticated


class CostCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CostCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CostCategory.objects.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user,business=self.request.user.business)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)