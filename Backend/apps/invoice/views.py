from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from apps.invoice.models import Invoice
from apps.invoice.services.invoice_service import create_invoice
from apps.invoice.serializers import read,create
from django_filters.rest_framework import DjangoFilterBackend
from apps.invoice.filters.filter import InvoiceFilter
from apps.core.Pagination import CursorPagination
from apps.permission.invoice import InvoicePermission


class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [InvoicePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InvoiceFilter
    pagination_class = CursorPagination

    def get_queryset(self):
        return (Invoice.objects
        .filter(business=self.request.user.business)
        .select_related("customer")
        .order_by("-created_at"))

    def get_serializer_class(self):
        if self.action == 'create':
            return create.InvoiceCreateSerializer

        return read.InvoiceReadSerializer


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data=serializer.validated_data
        invoice=create_invoice(**data,user=request.user)
        # invoice_read_serializer=read.InvoiceReadSerializer(invoice)
        # transaction.on_commit(lambda: send_invoice.delay(invoice.id))
        return Response({"message":"invoice sended in your email"},status=status.HTTP_201_CREATED)


