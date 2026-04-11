import logging
from apps.inventory.models import Inventory, InventoryTransaction
from apps.inventory.serializers.inventory_transaction import InventoryTransactionSerializer
from apps.supplier.models import SalesOrder

logger = logging.getLogger(__name__)

def update_sales_order_inventory_stock(sales_order: SalesOrder, request=None):
    """
    Updates the inventory stock level based on a delivered Sales Order (Stock OUT).
    """
    inventory, created = Inventory.objects.get_or_create(
        branch=sales_order.branch,
        defaults={'business': sales_order.business}
    )

    items_data = [
        {"product_id": item.product.id, "quantity": item.quantity}
        for item in sales_order.items.all()
    ]

    data = {
        "branch_id": sales_order.branch.id,
        "action": InventoryTransaction.Action.OUT,
        "description": f"Stock OUT — Sales Order #{sales_order.id} | {sales_order.customer.name}",
        "items": items_data
    }

    serializer = InventoryTransactionSerializer(
        data=data,
        context={
            'request': request,
            'inventory': inventory,
            'sales_order': sales_order
        }
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return True
