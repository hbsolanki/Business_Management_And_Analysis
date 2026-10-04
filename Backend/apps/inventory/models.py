from django.db import models
from django.core.validators import MinValueValidator
from apps.business.models import Business, Branch
from apps.base.models import BaseModel
from apps.master.utils.text_choices import InventoryTransactionAction
from apps.product.models import Product

class Inventory(models.Model):
    business=models.ForeignKey(to=Business, on_delete=models.CASCADE)
    branch = models.OneToOneField(to=Branch, on_delete=models.CASCADE, related_name="inventory")

    class Meta:
        db_table="bma_inventory"
        indexes=[models.Index(fields=["business"]), models.Index(fields=["branch"])]
        constraints = [
            models.UniqueConstraint(fields=["branch"], name="unique_inventory_branch")]


class InventoryProduct(BaseModel):
    inventory=models.ForeignKey(to=Inventory, on_delete=models.CASCADE,related_name="inventory_product_item")
    product = models.ForeignKey(to=Product, on_delete=models.CASCADE,related_name="inventory_product")
    stock_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        db_table="bma_inventory_product"
        indexes=[models.Index(fields=["inventory"])]
        constraints = [
            models.UniqueConstraint(fields=["inventory", "product"], condition=models.Q(is_deleted=False), name="unique_inventory_product") ]

class InventoryTransaction(BaseModel):
    Action = InventoryTransactionAction

    action=models.CharField(max_length=10,choices=Action.choices)
    description=models.CharField(max_length=200)
    inventory=models.ForeignKey(Inventory,on_delete=models.CASCADE,related_name="inventory_transactions")
    purchase_order = models.ForeignKey(
        'supplier.PurchaseOrder',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='inventory_transactions'
    )

    class Meta:
        db_table="bma_inventory_transaction"
        indexes = [
            models.Index(fields=["inventory"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["purchase_order"]),
        ]

class InventoryTransactionItem(models.Model):
    transaction=models.ForeignKey(InventoryTransaction,on_delete=models.CASCADE,related_name="items")
    product=models.ForeignKey(Product,on_delete=models.SET_NULL,null=True,blank=True)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])

    class Meta:
        db_table="bma_inventory_transaction_item"
        indexes=[models.Index(fields=["transaction"])]