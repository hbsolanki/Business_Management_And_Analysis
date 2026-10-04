from django.db import models
from apps.base.models import BaseModel, GST
from apps.business.models import Business, Branch, BusinessCustomer
from apps.master.utils.text_choices import OrderStatus
from apps.product.models import Product


class Supplier(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="suppliers")
    supplier_business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="supplier_business", null=True, blank=True)
    name = models.CharField(max_length=100)
    contact_person = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    mobile_number = models.CharField(max_length=15)
    gst_number = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    same_platform = models.BooleanField(default=False)

    class Meta:
        db_table = "bma_supplier"
        constraints = [
            models.UniqueConstraint(
                fields=["business", "mobile_number"], 
                condition=models.Q(is_deleted=False),
                name="unique_supplier_mobile_per_business"
            ),
            models.UniqueConstraint(
                fields=["business", "gst_number"], 
                name="unique_supplier_gst_per_business",
                condition=models.Q(gst_number__isnull=False, is_deleted=False)
            ),
            models.UniqueConstraint(
                fields=["business", "supplier_business"], 
                name="unique_supplier_business_per_business",
                condition=models.Q(supplier_business__isnull=False, is_deleted=False)
            )
        ]
        indexes = [
            models.Index(fields=["business", "mobile_number"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class BaseOrder(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="%(class)ss")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="%(class)ss", null=True, blank=True)
    order_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=15, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    notes = models.TextField(null=True, blank=True)
    
    # Financial Totals (Static for immutability)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Linked GST details for the entire order
    gst = models.ForeignKey(GST, on_delete=models.SET_NULL, null=True, blank=True, related_name="%(class)ss")

    class Meta:
        abstract = True


class BaseOrderItem(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="%(class)ss")
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Linked GST details per item
    gst = models.ForeignKey(GST, on_delete=models.SET_NULL, null=True, blank=True, related_name="%(class)ss")

    # Static snapshot fields for historical immutability
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        abstract = True


class PurchaseOrder(BaseOrder):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    received_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bma_purchase_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "branch", "supplier"]),
            models.Index(fields=["business", "received_at"]),
        ]

    def __str__(self):
        return f"PO #{self.id} - {self.supplier.name}"


class PurchaseOrderItem(BaseOrderItem):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")

    class Meta:
        db_table = "bma_purchase_order_item"
        constraints = [
            models.UniqueConstraint(fields=["purchase_order", "product"], name="unique_product_per_purchase_order")
        ]


class SalesOrder(BaseOrder):
    customer = models.ForeignKey(BusinessCustomer, on_delete=models.PROTECT, related_name="sales_orders", null=True, blank=True)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sales_orders"
    )

    class Meta:
        db_table = "bma_sales_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "branch", "customer"]),
            models.Index(fields=["business", "-created_at"]),
        ]

    def __str__(self):
        return f"SO #{self.id} - {self.customer.name if self.customer else 'No Customer'}"


class SalesOrderItem(BaseOrderItem):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="items")

    class Meta:
        db_table = "bma_sales_order_item"
        constraints = [
            models.UniqueConstraint(fields=["sales_order", "product"], name="unique_product_per_sales_order")
        ]

