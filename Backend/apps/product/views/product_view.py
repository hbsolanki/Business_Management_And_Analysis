from django.db import transaction
from django.core.cache import cache
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status

from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog
from apps.product.models import Product
from apps.product.serializers.product import ProductSerializer
from apps.product.filters import ProductFilter
from apps.subscription.decorators.limits import limit_required
from apps.base.views.base_view import BaseViewSet


class ProductViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.PRODUCT
    filterset_class = ProductFilter
    serializer_class = ProductSerializer
    queryset = Product.objects.all()

    def get_queryset(self):
        # BaseViewSet applies business isolation; we only add ordering here
        return super().get_queryset().order_by("-is_active", "-created_at", "-id")

    @limit_required("max_products", resource_model=Product)
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        from apps.subscription.utils.entitlements import get_active_subscription, increment_usage
        subscription = get_active_subscription(request.user.business)
        if subscription:
            increment_usage(subscription, "product_created")
            cache.delete(f"subscription:usage:{subscription.id}")
        return response
