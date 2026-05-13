from django.db import models
from decimal import Decimal
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product
from apps.base.models import BaseModel, GST


class Invoice(BaseModel):
    payment_type = [
        ("CASH", "Cash"),
        ("ONLINE", "Online"),
    ]
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="invoices")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, related_name="invoices", null=True, blank=True)
    customer = models.ForeignKey(BusinessCustomer, on_delete=models.SET_NULL, related_name="customer_invoices", null=True, blank=True)
    sales_order = models.ForeignKey("supplier.SalesOrder", on_delete=models.SET_NULL, related_name="invoices", null=True, blank=True)
    payment_mode = models.CharField(choices=payment_type, max_length=6)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    sub_total = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Linked GST details for the entire invoice
    gst = models.ForeignKey(GST, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    
    payment_date=models.DateTimeField( null=True, blank=True)
    transaction_id=models.CharField(max_length=255, null=True, blank=True)

    @property
    def total_tax(self):
        return self.gst.gst_amount if self.gst else 0

    @property
    def cgst_total(self):
        return self.gst.cgst_amount if self.gst else 0

    @property
    def sgst_total(self):
        return self.gst.sgst_amount if self.gst else 0

    @property
    def igst_total(self):
        return self.gst.igst_amount if self.gst else 0

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
    product=models.ForeignKey(Product, on_delete=models.SET_NULL,related_name="product_invoice",blank=True,null=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE,related_name="invoice_items")
    quantity = models.PositiveIntegerField()
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    @property
    def subtotal(self):
        return self.quantity * self.base_price

    @property
    def tax_rate(self):
        return self.product.output_gst_rate if self.product else 0

    @property
    def tax_amount(self):
        from apps.base.utils.tax import TaxCalculator
        data = TaxCalculator.calculate_gst(self.base_price * self.quantity, self.tax_rate)
        return data["tax_amount"]

    @property
    def cgst_amount(self):
        from apps.base.utils.tax import TaxCalculator
        data = TaxCalculator.calculate_gst(self.base_price * self.quantity, self.tax_rate)
        return data["cgst_amount"]

    @property
    def sgst_amount(self):
        from apps.base.utils.tax import TaxCalculator
        data = TaxCalculator.calculate_gst(self.base_price * self.quantity, self.tax_rate)
        return data["sgst_amount"]

    @property
    def igst_amount(self):
        from apps.base.utils.tax import TaxCalculator
        data = TaxCalculator.calculate_gst(self.base_price * self.quantity, self.tax_rate)
        return data["igst_amount"]

    class Meta:
        db_table = "bma_product_invoice"
        constraints = [
            models.UniqueConstraint(fields=["invoice", "product"], name="unique_product_per_invoice")
        ]
        indexes = [models.Index(fields=["invoice"])]
