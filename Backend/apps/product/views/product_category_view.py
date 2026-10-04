from rest_framework.viewsets import ModelViewSet
from apps.base.views.base_view import BaseViewSet
from apps.product.models import ProductCategory
from apps.product.serializers.product_category import ProductCategorySerializer
from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog


class ProductCategoryViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.PRODUCT
    serializer_class = ProductCategorySerializer
    queryset = ProductCategory.objects.all()

    def get_queryset(self):
        # BaseViewSet.apply_business_filter handles business isolation
        return super().get_queryset()
