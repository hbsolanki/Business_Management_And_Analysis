from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action

from apps.core.Pagination import CursorPagination
from apps.permission.inventory import InventoryPermission
from apps.inventory.models import Inventory, InventoryProduct, InventoryTransaction
from apps.inventory.serializers import create, read
from apps.inventory.services.inventory_transaction_service import create_inventory_transaction
from apps.inventory.filters.filter import  InventoryTransactionFilter,InventoryProductFilter
from rest_framework.exceptions import ValidationError


class InventoryViewSet(viewsets.GenericViewSet):
    permission_classes = [InventoryPermission]
    filter_backends = [DjangoFilterBackend]
    pagination_class = CursorPagination

    def get_inventory(self, user):
        try:
            return Inventory.objects.get(business=user.business)
        except Inventory.DoesNotExist:
            raise ValidationError("Inventory not found")
    def get_filterset_class(self):
        if self.action == "product_stock_get":
            return InventoryProductFilter
        elif self.action == "inventory_transaction_get":
            return InventoryTransactionFilter
        return None

    def list(self, request):
        inventory = self.get_inventory(request.user)
        serializer = read.InventoryReadSerializer(inventory)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="stock")
    def product_stock_get(self, request):
        inventory = self.get_inventory(request.user)

        qs = (
            InventoryProduct.objects
            .filter(inventory=inventory)
            .select_related("product")
            .order_by("-created_at")
        )

        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = read.InventoryProductReadSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = read.InventoryProductReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="transaction")
    def inventory_transaction_get(self, request):
        inventory = self.get_inventory(request.user)

        qs = (
            InventoryTransaction.objects
            .filter(inventory=inventory)
            .prefetch_related("items__product")
            .order_by("-created_at")
        )
        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = read.InventoryTransReadSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = read.InventoryTransReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="transaction/new")
    def inventory_transaction_post(self, request):
        inventory = self.get_inventory(request.user)

        serializer = create.InventoryTransCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        transaction = create_inventory_transaction(
            inventory=inventory,
            action=serializer.validated_data["action"],
            description=serializer.validated_data["description"],
            items=serializer.validated_data["items"],
            user=request.user,
        )

        return Response(
            {
                "message": "Transaction completed",
                "transaction_id": transaction.id,
            },
            status=status.HTTP_201_CREATED,
        )
