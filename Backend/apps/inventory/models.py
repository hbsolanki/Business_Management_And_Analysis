from django.db import models
from django.core.validators import MinValueValidator
from apps.business_app.models import Business
from apps.core.model import BaseModel
from apps.product.models import Product
from apps.user.models import User

class Inventory(models.Model):
    business=models.OneToOneField(to=Business, on_delete=models.CASCADE)

    class Meta:
        db_table="bma_inventory"
        indexes=[models.Index(fields=["business"])]


class InventoryProduct(BaseModel):
    inventory=models.ForeignKey(to=Inventory, on_delete=models.CASCADE,related_name="inventory_products")
    product = models.ForeignKey(to=Product, on_delete=models.CASCADE)
    stock_quantity = models.IntegerField(validators=[MinValueValidator(0)])

    class Meta:
        db_table="bma_inventory_product"
        indexes=[models.Index(fields=["inventory"])]
        constraints = [
            models.UniqueConstraint(fields=["inventory", "product"],name="unique_inventory_product") ]

class InventoryTransaction(BaseModel):
    action_types=[
        ("IN","Stock In"),
        ("OUT","Stock Out")
    ]

    action=models.CharField(max_length=10,choices=action_types)
    description=models.CharField(max_length=200)
    inventory=models.ForeignKey(Inventory,on_delete=models.CASCADE,related_name="inventory_transactions")

    class Meta:
        db_table="bma_inventory_transaction"
        indexes = [
            models.Index(fields=["inventory"]),
            models.Index(fields=["created_at"]),
        ]

class InventoryTransactionItem(models.Model):
    transaction=models.ForeignKey(InventoryTransaction,on_delete=models.CASCADE,related_name="items")
    product=models.ForeignKey(Product,on_delete=models.SET_NULL,null=True,blank=True)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])

    class Meta:
        db_table="bma_inventory_transaction_item"
        indexes=[models.Index(fields=["transaction"])]