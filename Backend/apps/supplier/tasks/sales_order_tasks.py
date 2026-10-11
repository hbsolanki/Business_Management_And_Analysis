from decimal import Decimal
from celery import shared_task
from apps.supplier.models import SalesOrder, OrderStatus
from apps.notification.utils import send_notification
from apps.employee.models import UserBusinessRole, UserRole
import logging

logger = logging.getLogger(__name__)

@shared_task
def synchronize_sales_order_to_customer_task(sales_order_id):
    """
    Syncs a Sales Order with the customer's platform.
    If same_platform, creates a corresponding Purchase Order in the customer's business.
    """
    try:
        sales_order = SalesOrder.objects.get(id=sales_order_id)

        # 1. Same-Platform Sync
        if sales_order.customer and sales_order.customer.same_platform and not sales_order.purchase_order:
            target_business = sales_order.customer.customer_business
            if not target_business:
                logger.error(f"SO #{sales_order_id} customer has same_platform=True but no customer_business linked.")
                return

            # Find reciprocal Supplier in target business
            from apps.supplier.models import Supplier
            supplier = Supplier.objects.filter(
                business=target_business,
                supplier_business=sales_order.business,
                same_platform=True
            ).first()

            if not supplier:
                logger.error(f"Reciprocal supplier not found in business {target_business.name} for source business {sales_order.business.name}")
                return

            # Map items by SKU
            from apps.product.models import Product
            po_items = []
            for item in sales_order.items.all():
                sku = item.product.sku
                try:
                    target_product = Product.objects.get(business=target_business, sku=sku, is_active=True)
                    po_items.append({
                        "product_id": target_product.id,
                        "quantity": item.quantity,
                        "price": getattr(item, "price", Decimal("0.00")),
                    })
                except Product.DoesNotExist:
                    logger.warning(f"SKU {sku} not found in target business {target_business.name}. Skipping item.")
                    
                    # Notify Seller (Supplier Owner)
                    supplier_owner = UserBusinessRole.objects.filter(business=sales_order.business, role=UserRole.OWNER).first()
                    if supplier_owner:
                        send_notification(
                            user=supplier_owner.user,
                            title="Unmapped Item in Sales Order",
                            content=f"The item '{sku}' is not recognized by {sales_order.customer.name}. It was skipped in the auto-generated Purchase Order.",
                            action_type="TASK_CREATED",
                            action_link=f"/supplier/sales-orders/{sales_order.id}"
                        )
                    
                    # Notify Buyer (Customer Owner)
                    customer_owner = UserBusinessRole.objects.filter(business=target_business, role=UserRole.OWNER).first()
                    if customer_owner:
                        product_name = item.product.name
                        category_obj = getattr(item.product, "product_category", None)
                        category_name = category_obj.name if category_obj else "Uncategorized"
                        send_notification(
                            user=customer_owner.user,
                            title="Inventory Match Alert",
                            content=f"Supplier {sales_order.business.name} created a Purchase Order for you, but it includes {product_name} (Category: {category_name}) with SKU {sku}, which is not in your inventory.",
                            action_type="TASK_CREATED",
                            action_link="supplier/purchase-orders/" # Link to list since ID not yet known
                        )

            if not po_items:
                logger.warning(f"No items could be mapped for PO creation in {target_business.name}. Skipping sync.")
                return

            # Create PO via Serializer
            target_branch = target_business.branches.first()

            po_data = {
                "supplier_id": supplier.id,
                "branch_id": target_branch.id if target_branch else None,
                "status": sales_order.status,
                "notes": f"Auto-generated from SO #{sales_order.id} ({sales_order.business.name})",
                "items": po_items,
            }

            from apps.supplier.serializers.purchase_order import PurchaseOrderSerializer
            serializer = PurchaseOrderSerializer(data=po_data, context={"business": target_business})
            if serializer.is_valid():
                purchase_order = serializer.save()
                sales_order.purchase_order = purchase_order
                sales_order.save(update_fields=["purchase_order"])

                # Invalidate target business cache
                from apps.master.utils.cache import invalidate_business_cache
                invalidate_business_cache("purchase_order", target_business.id)

                # Notify Customer Owner
                owner_role = UserBusinessRole.objects.filter(business=target_business, role=UserRole.OWNER).first()
                if owner_role:
                    send_notification(
                        user=owner_role.user,
                        title="New Purchase Order Created",
                        content=f"A new Purchase Order #{purchase_order.id} has been created from Sales Order #{sales_order.id} by {sales_order.business.name}.",
                        action_type="TASK_CREATED",
                        action_link=f"supplier/purchase-orders/{purchase_order.id}"
                    )

                logger.info(f"Successfully created PO #{purchase_order.id} in {target_business.name} from SO #{sales_order.id}")
            else:
                logger.error(f"Failed to create PO from SO #{sales_order.id}: {serializer.errors}")

    except SalesOrder.DoesNotExist:
        logger.error(f"Sync task failed: SalesOrder #{sales_order_id} not found.")
    except Exception as e:
        if 'sales_order' in locals():
            message = f"Sync failed: {str(e)}"
            sales_order.status = OrderStatus.FAILED
            sales_order.notes = f"{sales_order.notes}\n[{message}]" if sales_order.notes else message
            sales_order.save(update_fields=["status", "notes"])
        logger.error(f"Unexpected error in synchronize_sales_order_to_customer_task: {str(e)}")

@shared_task
def synchronize_purchase_order_status_update_to_customer_task(sales_order_id):
    """
    Syncs a Sales Order status update to the customer.
    If same_platform, updates the linked Purchase Order.
    Otherwise, pushes to their external API.
    """
    try:
        sales_order = SalesOrder.objects.get(id=sales_order_id)
        
        if sales_order.customer and sales_order.customer.same_platform:
            # Find the linked PurchaseOrder
            purchase_order = sales_order.purchase_order
            if purchase_order:
                # Sync status: SalesOrder status -> PurchaseOrder status
                # In same platform, they share the same OrderStatus choices
                if purchase_order.status != sales_order.status:
                    purchase_order.status = sales_order.status
                    purchase_order.save(update_fields=["status"])
                    logger.info(f"Direct synced status {sales_order.status} from SO #{sales_order.id} to PO #{purchase_order.id}")

                    # Invalidate target business cache
                    from apps.master.utils.cache import invalidate_business_cache
                    invalidate_business_cache("purchase_order", purchase_order.business.id)
                    
                    # Notify Customer Owner
                    owner_role = UserBusinessRole.objects.filter(business=purchase_order.business, role=UserRole.OWNER).first()
                    if owner_role:
                        send_notification(
                            user=owner_role.user,
                            title="Purchase Order Updated",
                            content=f"Your Purchase Order #{purchase_order.id} status has been updated to {purchase_order.status} by your supplier.",
                            action_type="TASK_UPDATED",
                            action_link=f"supplier/purchase-orders/{purchase_order.id}"
                        )

                    # Trigger inventory update for PO if delivered
                    if sales_order.status == OrderStatus.DELIVERED:
                        from apps.supplier.utils import update_purchase_order_inventory_stock
                        update_purchase_order_inventory_stock(purchase_order=purchase_order, action="IN")
            else:
                logger.warning(f"SO #{sales_order_id} is same_platform but has no linked purchase_order.")

    except SalesOrder.DoesNotExist:
        logger.error(f"Sync status task failed: SalesOrder #{sales_order_id} not found.")
    except Exception as e:
        logger.error(f"Unexpected error in synchronize_purchase_order_status_update_to_customer_task: {str(e)}")


@shared_task
def synchronize_sales_order_items_update_to_customer_task(sales_order_id):
    """
    Syncs Sales Order items to the customer.
    If same_platform, updates the linked Purchase Order items.
    """
    try:
        from apps.supplier.models import PurchaseOrderItem
        from apps.product.models import Product
        
        sales_order = SalesOrder.objects.get(id=sales_order_id)
        
        if sales_order.customer and sales_order.customer.same_platform:
            # Find the linked PurchaseOrder
            purchase_order = sales_order.purchase_order
            if purchase_order:
                source_items = sales_order.items.all()
                target_items_map = {item.product.sku: item for item in purchase_order.items.all()}
                
                seen_skus = set()
                total_amount = 0

                for s_item in source_items:
                    sku = s_item.product.sku
                    seen_skus.add(sku)
                    
                    quantity = s_item.quantity
                    cost = getattr(s_item, "price", Decimal("0.00"))

                    if sku in target_items_map:
                        t_item = target_items_map[sku]
                        if t_item.quantity != quantity or t_item.price != cost:
                            t_item.quantity = quantity
                            t_item.price = cost
                            t_item.save()
                    else:
                        # Create new item in Purchase Order
                        try:
                            target_product = Product.objects.get(sku=sku, business=purchase_order.business, is_active=True)
                            PurchaseOrderItem.objects.create(
                                purchase_order=purchase_order,
                                product=target_product,
                                quantity=quantity,
                                price=cost
                            )
                        except Product.DoesNotExist:
                            logger.warning(f"SKU {sku} not found in business {purchase_order.business.name}. Skipping item sync.")
                            
                            # Notify Seller (Supplier Owner)
                            supplier_owner = UserBusinessRole.objects.filter(business=sales_order.business, role=UserRole.OWNER).first()
                            if supplier_owner:
                                send_notification(
                                    user=supplier_owner.user,
                                    title="Unmapped Item in Sales Order",
                                    content=f"The item '{sku}' is not recognized by {sales_order.customer.name}. It was skipped in the linked Purchase Order.",
                                    action_type="TASK_UPDATED",
                                    action_link=f"/supplier/sales-orders/{sales_order.id}"
                                )
                            
                            # Notify Buyer (Customer Owner)
                            customer_owner = UserBusinessRole.objects.filter(business=purchase_order.business, role=UserRole.OWNER).first()
                            if customer_owner:
                                product_name = s_item.product.name
                                category_obj = getattr(s_item.product, "product_category", None)
                                category_name = category_obj.name if category_obj else "Uncategorized"
                                send_notification(
                                    user=customer_owner.user,
                                    title="Inventory Match Alert",
                                    content=f"Supplier {sales_order.business.name} added {product_name} (Category: {category_name}) to your order, but you don't have this product (SKU: {sku}) in your inventory.",
                                    action_type="TASK_UPDATED",
                                    action_link=f"supplier/purchase-orders/{purchase_order.id}"
                                )

                    total_amount += (quantity * cost)

                # Delete items in Purchase Order that are not in Sales Order
                for sku, t_item in target_items_map.items():
                    if sku not in seen_skus:
                        t_item.delete()

                # Update PO total amount
                purchase_order.total_amount = total_amount
                purchase_order.save(update_fields=["total_amount"])
                logger.info(f"Synced items from SO #{sales_order.id} to PO #{purchase_order.id}")

                # Invalidate target business cache
                from apps.master.utils.cache import invalidate_business_cache
                invalidate_business_cache("purchase_order", purchase_order.business.id)

                # Notify Customer Owner
                owner_role = UserBusinessRole.objects.filter(business=purchase_order.business, role=UserRole.OWNER).first()
                if owner_role:
                    send_notification(
                        user=owner_role.user,
                        title="Purchase Order Items Updated",
                        content=f"The items in your Purchase Order #{purchase_order.id} have been updated by your supplier.",
                        action_type="TASK_UPDATED",
                        action_link=f"supplier/purchase-orders/{purchase_order.id}"
                    )
            else:
                logger.warning(f"SO #{sales_order_id} is same_platform but has no linked purchase_order.")


    except SalesOrder.DoesNotExist:
        logger.error(f"Sync items task failed: SalesOrder #{sales_order_id} not found.")
    except Exception as e:
        logger.error(f"Unexpected error in synchronize_sales_order_items_update_to_customer_task: {str(e)}")
