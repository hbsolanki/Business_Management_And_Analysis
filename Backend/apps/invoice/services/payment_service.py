from django.utils import timezone
from apps.invoice.models import Invoice

class InvoicePaymentService:
    @staticmethod
    def handle_success(metadata, transaction_id):
        invoice_id = metadata.get('invoice_id')
        if not invoice_id:
            return

        try:
            invoice = Invoice.objects.get(id=invoice_id)
            invoice.payment_mode = "ONLINE"
            invoice.transaction_id = transaction_id 
            invoice.payment_date = timezone.now()
            invoice.save(update_fields=['payment_date', 'payment_mode', 'transaction_id'])
            
        except Invoice.DoesNotExist:
            pass

    @staticmethod
    def handle_failure(metadata):
        invoice_id = metadata.get('invoice_id')
        if invoice_id:
            Invoice.objects.filter(id=invoice_id).delete()
