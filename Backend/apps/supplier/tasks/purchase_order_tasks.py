from celery import shared_task
from apps.supplier.models import PurchaseOrder, OrderStatus
from apps.business.models import BusinessCustomer
from apps.notification.utils import send_notification
from apps.employee.models import UserBusinessRole, UserRole
import logging

logger = logging.getLogger(__name__)

@shared_task
def synchronize_purchase_order_to_supplier_task(purchase_order_id):
    try:
        from apps.supplier.models import SalesOrder
        purchase_order = PurchaseOrder.objects.get(id=purchase_order_id)
        
        # 0. Prevent duplicate synchronization
        if SalesOrder.objects.filter(purchase_order=purchase_order).exists():
            logger.info(f"Sync skipped: SalesOrder already exists for PurchaseOrder #{purchase_order_id}")
            return

        if purchase_order.supplier.same_platform:
            target_business = purchase_order.supplier.supplier_business
            if not target_business:
                purchase_order.status = OrderStatus.FAILED
                message = f"Sync failed: Supplier {purchase_order.supplier.name} is same_platform but has no supplier_business linked."
                purchase_order.notes = f"{purchase_order.notes}\n[{message}]" if purchase_order.notes else message
                purchase_order.save(update_fields=["status", "notes"])
                return

            customer = BusinessCustomer.objects.filter(
                business=target_business,
                customer_business=purchase_order.business
            ).first()

            if not customer:
                purchase_order.status = OrderStatus.FAILED
                message = f"Sync failed: No BusinessCustomer found in {target_business.name} for business {purchase_order.business.name}."
                purchase_order.notes = f"{purchase_order.notes}\n[{message}]" if purchase_order.notes else message
                purchase_order.save(update_fields=["status", "notes"])
                return

            from apps.product.models import Product
            items_data = []
            for po_item in purchase_order.items.all():
                sku = po_item.product.sku
                try:
                    # Check if product exists in target business
                    target_product = Product.objects.get(sku=sku, business=target_business, is_active=True)
                    items_data.append({
                        "sku": sku,
                        "quantity": po_item.quantity,
                        "unit_price": po_item.unit_cost,
                    })
                except Product.DoesNotExist:
                    logger.warning(f"SKU {sku} not found in target business {target_business.name}. Skipping item.")
                    
                    # Notify Buyer (Customer Owner)
                    customer_owner = UserBusinessRole.objects.filter(business=purchase_order.business, role=UserRole.OWNER).first()
                    if customer_owner:
                        send_notification(
                            user=customer_owner.user,
                            title="Unmapped Item in Purchase Order",
                            content=f"The item '{sku}' is not available with {purchase_order.supplier.name}. It was skipped in the generated Sales Order.",
                            action_type="TASK_CREATED",
                            action_link=f"supplier/purchase-orders/{purchase_order.id}"
                        )
                    
                    # Notify Seller (Supplier Owner)
                    supplier_owner = UserBusinessRole.objects.filter(business=target_business, role=UserRole.OWNER).first()
                    if supplier_owner:
                        product_name = po_item.product.name
                        category_name = po_item.product.category.name if po_item.product.category else "Uncategorized"
                        send_notification(
                            user=supplier_owner.user,
                            title="Product Request Alert",
                            content=f"Customer {purchase_order.business.name} requested {product_name} (Category: {category_name}) via SKU {sku}, but it is not in your inventory.",
                            action_type="TASK_CREATED",
                            action_link=f"/supplier/sales-orders/" # Link to list since ID not yet known
                        )

            if not items_data:
                logger.warning(f"No items could be mapped for SO creation in {target_business.name}. Skipping sync.")
                return

            sales_order_data = {
                "branch_id": target_business.branches.first().id if target_business.branches.exists() else None,
                "customer_id": customer.id,
                "status": purchase_order.status,
                "notes": f"Sync from PO #{purchase_order.id} ({purchase_order.business.name})",
                "purchase_order": purchase_order.id,
                "items": items_data,
            }

            from apps.supplier.serializers.sales_order import SalesOrderSerializer
            serializer = SalesOrderSerializer(
                data=sales_order_data,
                context={"business": target_business}
            )
            serializer.is_valid(raise_exception=True)
            sales_order = serializer.save()

            # Invalidate target business cache
            from apps.master.utils.cache import invalidate_business_cache
            invalidate_business_cache("sales_order", target_business.id)
            


            # Notify Supplier Owner
            owner_role = UserBusinessRole.objects.filter(business=target_business, role=UserRole.OWNER).first()
            if owner_role:
                send_notification(
                    user=owner_role.user,
                    title="New Sales Order Created",
                    content=f"A new Sales Order #{sales_order.id} has been created from Purchase Order #{purchase_order.id} by {purchase_order.business.name}.",
                    action_type="TASK_CREATED",
                    action_link=f"/supplier/sales-orders/{sales_order.id}"
                )

            logger.info(
                f"Successfully synced PO #{purchase_order_id} to SO #{sales_order.id} on same platform."
            )

    except PurchaseOrder.DoesNotExist:
        logger.error(f"Sync task failed: PurchaseOrder #{purchase_order_id} not found.")
    except Exception as e:
        if 'purchase_order' in locals():
            message = f"Sync failed: {str(e)}"
            purchase_order.status = OrderStatus.FAILED
            purchase_order.notes = (
                f"{purchase_order.notes}\n[{message}]" if purchase_order.notes else message
            )
            purchase_order.save(update_fields=["status", "notes"])
        logger.error(f"Unexpected error in synchronize_purchase_order_to_supplier_task: {str(e)}")


@shared_task
def synchronize_purchase_order_status_update_to_supplier_task(purchase_order_id):
    """
    Syncs a Purchase Order status update to the supplier.
    If same_platform, updates the linked Sales Order.
    """
    try:
        from apps.supplier.models import SalesOrder
        purchase_order = PurchaseOrder.objects.get(id=purchase_order_id)
        
        if purchase_order.supplier and purchase_order.supplier.same_platform:
            # Find linked SalesOrders
            linked_sos = SalesOrder.objects.filter(purchase_order=purchase_order)
            
            for so in linked_sos:
                if so.status != purchase_order.status:
                    so.status = purchase_order.status
                    so.save(update_fields=["status"])
                    logger.info(f"Direct synced status {purchase_order.status} from PO #{purchase_order.id} to SO #{so.id}")
                    
                    # Invalidate target business cache
                    from apps.master.utils.cache import invalidate_business_cache
                    invalidate_business_cache("sales_order", so.business.id)
                    
                    # Notify Owner
                    owner_role = UserBusinessRole.objects.filter(business=so.business, role=UserRole.OWNER).first()
                    if owner_role:
                        send_notification(
                            user=owner_role.user,
                            title="Sales Order Updated",
                            content=f"Your Sales Order #{so.id} status has been updated to {so.status} via linked Purchase Order #{purchase_order.id}.",
                            action_type="TASK_UPDATED",
                            action_link=f"/supplier/sales-orders/{so.id}"
                        )

                    # Trigger inventory update for SO if delivered
                    if purchase_order.status == OrderStatus.DELIVERED:
                        from apps.supplier.utils import update_purchase_order_inventory_stock
                        update_purchase_order_inventory_stock(sales_order=so, action="OUT")


    except PurchaseOrder.DoesNotExist:
        logger.error(f"Sync status task failed: PurchaseOrder #{purchase_order_id} not found.")
    except Exception as e:
        logger.error(f"Unexpected error in synchronize_purchase_order_status_update_to_supplier_task: {str(e)}")


@shared_task
def synchronize_purchase_order_items_update_to_supplier_task(purchase_order_id):
    """
    Syncs Purchase Order items to the supplier.
    If same_platform, updates the linked Sales Order items.
    """
    try:
        from apps.supplier.models import SalesOrder, SalesOrderItem
        from apps.product.models import Product
        
        purchase_order = PurchaseOrder.objects.get(id=purchase_order_id)
        
        if purchase_order.supplier and purchase_order.supplier.same_platform:
            # Find linked SalesOrders
            linked_sos = SalesOrder.objects.filter(purchase_order=purchase_order)
            
            for so in linked_sos:
                source_items = purchase_order.items.all()
                target_items_map = {item.product.sku: item for item in so.items.all()}
                
                seen_skus = set()
                total_amount = 0

                for s_item in source_items:
                    sku = s_item.product.sku
                    seen_skus.add(sku)
                    
                    quantity = s_item.quantity
                    # PO unit_cost is SO unit_price
                    price = s_item.unit_cost

                    if sku in target_items_map:
                        t_item = target_items_map[sku]
                        if t_item.quantity != quantity or t_item.unit_price != price:
                            t_item.quantity = quantity
                            t_item.unit_price = price
                            t_item.save()
                    else:
                        # Create new item in Sales Order
                        try:
                            target_product = Product.objects.get(sku=sku, business=so.business, is_active=True)
                            SalesOrderItem.objects.create(
                                sales_order=so,
                                product=target_product,
                                quantity=quantity,
                                unit_price=price
                            )
                        except Product.DoesNotExist:
                            logger.warning(f"SKU {sku} not found in business {so.business.name}. Skipping item sync.")
                            
                            # Notify Buyer (Customer Owner)
                            customer_owner = UserBusinessRole.objects.filter(business=purchase_order.business, role=UserRole.OWNER).first()
                            if customer_owner:
                                send_notification(
                                    user=customer_owner.user,
                                    title="Unmapped Item in Purchase Order",
                                    content=f"The item '{sku}' is not available with {purchase_order.supplier.name}. It was skipped in the linked Sales Order.",
                                    action_type="TASK_UPDATED",
                                    action_link=f"supplier/purchase-orders/{purchase_order.id}"
                                )
                            
                            # Notify Seller (Supplier Owner)
                            supplier_owner = UserBusinessRole.objects.filter(business=so.business, role=UserRole.OWNER).first()
                            if supplier_owner:
                                product_name = s_item.product.name
                                category_name = s_item.product.category.name if s_item.product.category else "Uncategorized"
                                send_notification(
                                    user=supplier_owner.user,
                                    title="Product Request Alert",
                                    content=f"Customer {purchase_order.business.name} requested {product_name} (Category: {category_name}) with SKU {sku}, but it is not in your inventory.",
                                    action_type="TASK_UPDATED",
                                    action_link=f"/supplier/sales-orders/{so.id}"
                                )

                    total_amount += (quantity * price)

                # Delete items in Sales Order that are not in Purchase Order
                for sku, t_item in target_items_map.items():
                    if sku not in seen_skus:
                        t_item.delete()

                # Update SO total amount
                so.total_amount = total_amount
                so.save(update_fields=["total_amount"])
                logger.info(f"Synced items from PO #{purchase_order.id} to SO #{so.id}")

                # Invalidate target business cache
                from apps.master.utils.cache import invalidate_business_cache
                invalidate_business_cache("sales_order", so.business.id)

                # Notify Owner
                owner_role = UserBusinessRole.objects.filter(business=so.business, role=UserRole.OWNER).first()
                if owner_role:
                    send_notification(
                        user=owner_role.user,
                        title="Sales Order Items Updated",
                        content=f"The items in your Sales Order #{so.id} have been updated to match Purchase Order #{purchase_order.id}.",
                        action_type="TASK_UPDATED",
                        action_link=f"/sales-orders/{so.id}"
                    )

    except PurchaseOrder.DoesNotExist:
        logger.error(f"Sync items task failed: PurchaseOrder #{purchase_order_id} not found.")
    except Exception as e:
        logger.error(f"Unexpected error in synchronize_purchase_order_items_update_to_supplier_task: {str(e)}")


