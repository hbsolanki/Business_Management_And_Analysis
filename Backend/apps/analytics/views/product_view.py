from rest_framework.viewsets import ViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.product.models import Product
from apps.inventory.models import InventoryProduct
from apps.analytics.serializers.Product import (
    ProductDetailsSerializer,
    ProductStockSerializer,
)

class AnalysisProductViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="product/details")
    def product_details(self, request):
        products = Product.objects.all()
        serializer = ProductDetailsSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="product/stocks")
    def product_stocks(self, request):
        inventoryData = InventoryProduct.objects.select_related(
            "product", "product__product_category"
        )
        serializer = ProductStockSerializer(inventoryData, many=True)
        return Response(serializer.data)
