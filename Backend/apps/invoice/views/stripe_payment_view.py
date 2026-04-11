from rest_framework import status
from rest_framework.response import Response
from apps.invoice.models import Invoice
from apps.base.views.payment_base import BasePaymentViewSet

class PaymentViewSet(BasePaymentViewSet):
    """
    Invoice Payment ViewSet using shared BasePaymentViewSet.
    """

    def get_payment_details(self, request):
        invoice_id = request.data.get('invoice_id')
        invoice = Invoice.objects.get(id=invoice_id)
        
        return int(invoice.total_amount * 100), {
            "invoice_id": invoice.id,
            "business_id": invoice.business.id,
            "customer_id": invoice.customer.id,
            "type": "INVOICE"
        }

    def handle_not_found(self):
         return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)