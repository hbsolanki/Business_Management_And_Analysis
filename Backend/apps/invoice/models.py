from django.db import models
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from apps.base.models import BaseModel, GST
from apps.master.utils.text_choices import InvoicePaymentStatus


class Invoice(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="invoices")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, related_name="invoices", null=True, blank=True)
    customer = models.ForeignKey(BusinessCustomer, on_delete=models.SET_NULL, related_name="customer_invoices", null=True, blank=True)
    sales_order = models.ForeignKey("supplier.SalesOrder", on_delete=models.SET_NULL, related_name="invoices", null=True, blank=True)

    # Payment state — full payment details live in payment.InvoicePayment → payment.Payment
    payment_status = models.CharField(
        max_length=20,
        choices=InvoicePaymentStatus.choices,
        default=InvoicePaymentStatus.UNPAID,
        db_index=True,
    )

    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    sub_total = models.DecimalField(max_digits=12, decimal_places=2)

    # Linked GST details for the entire invoice
    gst = models.ForeignKey(GST, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")

    @property
    def paid_amount(self):
        """Sum of all successful payments linked to this invoice."""
        from django.db.models import Sum
        from apps.master.utils.text_choices import PaymentStatus
        result = self.payments.filter(
            payment__status=PaymentStatus.SUCCEEDED
        ).aggregate(total=Sum("payment__amount"))
        return result["total"] or 0

    @property
    def balance_due(self):
        """Remaining amount to be paid on this invoice."""
        return max(self.total_amount - self.paid_amount, 0)

    class Meta:
        db_table = "bma_invoice"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "branch", "-created_at"]),
            models.Index(fields=["customer", "-created_at"]),
        ]
        permissions = [
                ("create_invoice", "Can create invoice"),
                ("update_invoice", "Can update invoice"),
            ]

class ProductInvoice(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, related_name="product_invoice", blank=True, null=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="invoice_items")
    quantity = models.PositiveIntegerField()
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "bma_product_invoice"
        constraints = [
            models.UniqueConstraint(fields=["invoice", "product"], name="unique_product_per_invoice")
        ]
        indexes = [models.Index(fields=["invoice"])]
