import logging
from apps.inventory.models import Inventory
from apps.inventory.serializers.inventory_transaction import InventoryTransactionSerializer

logger = logging.getLogger(__name__)

def update_purchase_order_inventory_stock(purchase_order=None, sales_order=None, action="IN", request=None):
    """
    Standardized function to update inventory stock for both Purchase and Sales Orders.
    """
    if purchase_order:
        order = purchase_order
        link_key = "purchase_order"
        description_prefix = "PO"
        partner_name = purchase_order.supplier.name
    elif sales_order:
        order = sales_order
        link_key = "sales_order"
        description_prefix = "SO"
        partner_name = sales_order.customer.name if sales_order.customer else "Walk-in Customer"
    else:
        raise ValueError("Either purchase_order or sales_order must be provided.")

    inventory, _ = Inventory.objects.get_or_create(
        branch=order.branch,
        defaults={'business': order.business}
    )

    items_data = [
        {"product_id": item.product.id, "quantity": item.quantity}
        for item in order.items.all()
    ]

    data = {
        "branch_id": order.branch.id,
        "action": action,
        "description": f"Stock {action} — {description_prefix} #{order.id} | {partner_name}",
        "items": items_data
    }

    serializer = InventoryTransactionSerializer(
        data=data,
        context={
            'request': request,
            'inventory': inventory,
            link_key: order
        }
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return True
