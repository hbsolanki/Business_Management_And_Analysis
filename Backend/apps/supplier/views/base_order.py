from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from apps.master.utils.cache import make_cache_key, invalidate_cache

class BaseOrderViewSetMixin:
    """
    Mixin to handle caching logic for order viewsets (PurchaseOrder, SalesOrder).
    """
    cache_prefix = "order" # Override this in child classes (e.g., "purchase_order", "sales_order")
    cache_timeout = 60 * 15 # Default 15 mins

    def list(self, request, *args, **kwargs):
        cache_key = make_cache_key(request, self.cache_prefix, "list", request.user)
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, self.cache_timeout)
        return Response(response.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_cache(self.cache_prefix, "list", self.request.user)
        
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_cache(self.cache_prefix, "list", self.request.user)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_cache(self.cache_prefix, "list", self.request.user)
