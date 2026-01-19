from django.db import models

from apps.core.model import BaseModel
from apps.customer.models import Customer
from apps.product.models import Product
from apps.user.models import User
from apps.business_app.models import Business


class Invoice(BaseModel):
    payment_type=[
        ("CASH", "Cash"),
        ("ONLINE", "Online"),
    ]
    business=models.ForeignKey(Business, on_delete=models.CASCADE,related_name="invoices")
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL,related_name="customer_invoices", null=True, blank=True)
    payment_mode = models.CharField(choices=payment_type, max_length=6)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    sub_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "bma_invoice"


class ProductInvoice(models.Model):
    product=models.ForeignKey(Product, on_delete=models.SET_NULL,related_name="product_invoice",blank=True,null=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE,related_name="invoice_items")
    quantity = models.PositiveIntegerField()
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "bma_product_invoice"
        indexes = [models.Index(fields=["invoice"])]
