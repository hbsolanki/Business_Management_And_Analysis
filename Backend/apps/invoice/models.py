from django.db import models
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from apps.base.models import BaseModel


class Invoice(BaseModel):
    payment_type = [
        ("CASH", "Cash"),
        ("ONLINE", "Online"),
    ]
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="invoices")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, related_name="invoices", null=True, blank=True)
    customer = models.ForeignKey(BusinessCustomer, on_delete=models.SET_NULL, related_name="customer_invoices", null=True, blank=True)
    payment_mode = models.CharField(choices=payment_type, max_length=6)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    sub_total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date=models.DateTimeField( null=True, blank=True)
    transaction_id=models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "bma_invoice"
        indexes = [models.Index(fields=["business"])]
        permissions = [
                ("create_invoice", "Can create invoice"),
                ("update_invoice", "Can update invoice"),
            ]

class ProductInvoice(models.Model):
    product=models.ForeignKey(Product, on_delete=models.SET_NULL,related_name="product_invoice",blank=True,null=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE,related_name="invoice_items")
    quantity = models.PositiveIntegerField()
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "bma_product_invoice"
        indexes = [models.Index(fields=["invoice"])]
