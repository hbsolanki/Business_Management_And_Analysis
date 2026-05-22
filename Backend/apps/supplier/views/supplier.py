from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from apps.base.views.base_view import BaseViewSet
from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog
from apps.supplier.models import Supplier
from apps.supplier.serializers import SupplierSerializer
from apps.supplier.filters import SupplierFilter
from apps.master.utils.cache import make_cache_key, invalidate_cache
from django.core.cache import cache

class SupplierViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filterset_class = SupplierFilter
    activity_module = ActivityLog.Module.SUPPLIER

    def list(self, request, *args, **kwargs):
        cache_key = make_cache_key(request, "supplier", "list", request.user)
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 60 * 15) 
        return response

    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_cache("supplier", "list", self.request.user)
        
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_cache("supplier", "list", self.request.user)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_cache("supplier", "list", self.request.user)
