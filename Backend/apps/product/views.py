from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status

from apps.product.models import Product
from apps.product.serializers import create, read, update
from apps.product.services.product_service import create_product
from apps.permission.product import ProductPermission
from apps.product.filters.filter import ProductFilter
from apps.core.Pagination import CursorPagination


class ProductViewSet(ModelViewSet):
    filter_backends =[DjangoFilterBackend]
    pagination_class = CursorPagination
    filterset_class = ProductFilter
    permission_classes = [ProductPermission]

    def get_queryset(self):
        return Product.objects.filter(
            business=self.request.user.business
        )

    def get_serializer_class(self):
        if self.action == "create":
            return create.ProductCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return update.ProductUpdateSerializer
        return read.ProductReadSerializer

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        product = create_product(
            name=data["name"],
            cost_price=data["cost_price"],
            base_price=data["base_price"],
            description=data["description"],
            product_category=data["product_category"],
            sku=data["sku"],
            input_gst_rate=data["input_gst_rate"],
            output_gst_rate=data["output_gst_rate"],
            business=request.user.business,
            user=request.user,
        )

        return Response(
            {
                "message": "Product created successfully",
                "product": {
                    "id": product.id,
                    "sku": product.sku,
                },
            },
            status=status.HTTP_201_CREATED,
        )
