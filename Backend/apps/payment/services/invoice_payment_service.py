import logging
from apps.master.utils.text_choices import PaymentMethod, PaymentStatus
from apps.payment.serializers.invoice_payment.invoice_payment_webhook import WebhookInvoicePaymentSerializer

logger = logging.getLogger(__name__)


class InvoicePaymentService:

    @staticmethod
    def handle_success(metadata, transaction_id, method=PaymentMethod.CARD):
        """
        Processes successful payments natively using WebhookInvoicePaymentSerializer.
        """
        invoice_id = metadata.get("invoice_id")
        if not invoice_id:
            return

        try:
            serializer = WebhookInvoicePaymentSerializer(data={
                "invoice_id": int(invoice_id),
                "status": PaymentStatus.SUCCEEDED,
                "transaction_id": transaction_id,
                "connected_account_id": metadata.get("connected_account_id"),
                "method": method,
            })
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except Exception as exc:
            logger.exception("Failed to process invoice payment success serializer: %s", exc)

    @staticmethod
    def handle_failure(metadata, transaction_id=None):
        """
        Processes failed payments natively using WebhookInvoicePaymentSerializer.
        """
        invoice_id = metadata.get("invoice_id")
        if not invoice_id:
            return

        try:
            serializer = WebhookInvoicePaymentSerializer(data={
                "invoice_id": int(invoice_id),
                "status": PaymentStatus.FAILED,
                "transaction_id": transaction_id,
                "failure_reason": metadata.get("failure_reason", ""),
            })
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except Exception as exc:
            logger.exception("Failed to process invoice payment failure serializer: %s", exc)
