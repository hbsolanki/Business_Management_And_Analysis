from apps.inventory.models import Inventory, InventoryTransaction
from apps.inventory.serializers.inventory_transaction import InventoryTransactionSerializer

def reverse_order_inventory(order, old_items, old_branch, action_on_reversal, description_prefix, context_request):
    """
    Reverse the stock impact of an order (e.g., when moving from DELIVERED -> PENDING).
    """
    if not old_items:
        return

    old_inventory, _ = Inventory.objects.get_or_create(
        branch=old_branch,
        defaults={"business": order.business}
    )
    
    link_key = "sales_order" if description_prefix == "SO" else "purchase_order"
    
    reverse_serializer = InventoryTransactionSerializer(
        data={
            "action": action_on_reversal,
            "description": f"Stock {action_on_reversal} (Update Reversal) — {description_prefix} #{order.id}",
            "items": old_items,
            "branch_id": old_branch.id
        },
        context={
            "request": context_request,
            "inventory": old_inventory,
            link_key: order,
        },
    )
    reverse_serializer.is_valid(raise_exception=True)
    reverse_serializer.save()

def resync_order_inventory(order, old_items, old_branch, action_on_reversal, action_on_new, description_prefix, context_request):
    """
    Standardizes stock reversal and re-application for orders (SO or PO).
    Handles branch changes and maintains audit trail via InventoryTransaction.
    """
    # 1. Reverse OLD state
    reverse_order_inventory(order, old_items, old_branch, action_on_reversal, description_prefix, context_request)

    # 2. Apply NEW state (only if order is still DELIVERED)
    # Check if imports are needed inside to avoid circular deps if any
    from apps.supplier.models import OrderStatus
    if order.status != OrderStatus.DELIVERED:
        return

    new_items = list(order.items.values("product_id", "quantity"))
    new_inventory, _ = Inventory.objects.get_or_create(
        branch=order.branch,
        defaults={"business": order.business}
    )
    
    link_key = "sales_order" if description_prefix == "SO" else "purchase_order"
    
    new_serializer = InventoryTransactionSerializer(
        data={
            "action": action_on_new,
            "description": f"Stock {action_on_new} (Updated) — {description_prefix} #{order.id}",
            "items": new_items,
            "branch_id": order.branch.id
        },
        context={
            "request": context_request,
            "inventory": new_inventory,
            link_key: order,
        },
    )
    new_serializer.is_valid(raise_exception=True)
    new_serializer.save()
