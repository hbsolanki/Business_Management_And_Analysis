from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.inventory.models import (
    InventoryTransaction,
    InventoryTransactionItem,
    InventoryProduct,
    Inventory
)
from apps.product.models import Product

def create_inventory(business):
    return Inventory.objects.create(business=business)


@transaction.atomic
def create_inventory_transaction(*, inventory, action, description, items, user):

    txn = InventoryTransaction.objects.create(
        inventory=inventory,
        action=action,
        description=description,
        created_by=user,
    )

    product_ids = [item["productId"] for item in items]

    inventory_products = (
        InventoryProduct.objects
        .select_for_update()
        .filter(inventory=inventory, product_id__in=product_ids)
    )

    inventory_map = {ip.product_id: ip for ip in inventory_products}

    for item in items:
        product_id = item["productId"]
        quantity = item["quantity"]

        if quantity <= 0:
            raise ValidationError("Quantity must be greater than 0")

        inventory_product = inventory_map.get(product_id)

        if not inventory_product:
            try:
                product_obj = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise ValidationError(f"Product id {product_id} not found")

            inventory_product = InventoryProduct.objects.create(
                inventory=inventory,
                product=product_obj,
                stock_quantity=0
            )

            inventory_map[product_id] = inventory_product

        if action == "OUT" and quantity > inventory_product.stock_quantity:
            raise ValidationError({
                "items": [{
                    "productId": product_id,
                    "quantity": f"Insufficient stock for SKU {inventory_product.product.sku}"
                }]
            })

        if action == "OUT":
            inventory_product.stock_quantity -= quantity
        else:
            inventory_product.stock_quantity += quantity

        inventory_product.save(update_fields=["stock_quantity"])

        InventoryTransactionItem.objects.create(
            transaction=txn,
            product=inventory_product.product,
            quantity=quantity
        )

    return txn
