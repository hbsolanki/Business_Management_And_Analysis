from django.db import models
from apps.base.models import BaseModel
from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


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
            models.UniqueConstraint(fields=["business", "mobile_number"], name="unique_supplier_mobile_per_business")
        ]
        indexes = [
            models.Index(fields=["business", "mobile_number"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class PurchaseOrder(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="purchase_orders")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="purchase_orders", null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    
    order_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=15, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    notes = models.TextField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bma_purchase_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "branch", "supplier"]),
        ]

    def __str__(self):
        return f"PO #{self.id} - {self.supplier.name}"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="po_items")
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "bma_purchase_order_item"

    @property
    def subtotal(self):
        return self.quantity * self.unit_cost


class SalesOrder(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="sales_orders")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="sales_orders", null=True, blank=True)
    customer = models.ForeignKey(BusinessCustomer, on_delete=models.PROTECT, related_name="sales_orders", null=True, blank=True)
    
    order_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=15, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    notes = models.TextField(null=True, blank=True)

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
        ]

    def __str__(self):
        return f"SO #{self.id} - {self.customer.name if self.customer else 'No Customer'}"


class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sales_order_items")
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "bma_sales_order_item"

    @property
    def subtotal(self):
        return self.quantity * self.unit_price
