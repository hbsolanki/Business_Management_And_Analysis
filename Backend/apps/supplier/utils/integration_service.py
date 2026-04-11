import requests
import logging
from apps.supplier.models import PurchaseOrder, SalesOrder

logger = logging.getLogger(__name__)

def push_purchase_order_to_supplier_external_api(po: PurchaseOrder):
    """
    Pushes a locally created Purchase Order to the supplier's external platform.
    The external platform receives this as a Sales Order.
    """
    supplier = po.supplier
    if not supplier.api_url or not supplier.integration_active:
        return None

    # Prepare payload manually to avoid serializer AttributeErrors and internal fields
    items_data = []
    for item in po.items.all():
        items_data.append({
            "sku": item.product.sku,
            "quantity": item.quantity,
            "unit_price": float(item.unit_cost)
        })

    payload = {
        "items": items_data,
        "notes": po.notes or f"PO Sync from {po.business.name}",
        "order_date": po.order_date.isoformat() if po.order_date else None,
    }

    # Fetch the secret token
    api_key = supplier.api_key

    headers = {
        "X-BMA-API-Key": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            supplier.api_url,
            json=payload,
            headers=headers,
            timeout=15
        )

        if response.status_code in [200, 201]:
            # User decided external_po_id is not needed, so we don't store the returned ID
            return True
        else:
            # Raise exception so the celery task can mark it as FAILED
            raise RuntimeError(f"Supplier API failed: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Network error pushing PO #{po.id} to supplier: {str(e)}")
        raise


def push_purchase_order_status_to_supplier_external_api(po: PurchaseOrder, status: str):
    """
    Pushes a status update for a Purchase Order to the supplier's platform.
    """
    # Note: external_po_id was removed from the model. 
    # Without a remote ID, we cannot reliably target the status update on the supplier's side.
    logger.warning(f"Status sync for PO #{po.id} skipped: external_po_id is no longer tracked.")
    return False

def push_sales_order_status_to_customer_external_api(so: SalesOrder, status: str):
    """
    Pushes a status update for a Sales Order to the customer's platform.
    """
    customer = so.customer
    if not customer or not customer.api_url or not customer.integration_active:
        return False

    # For customer sync, we use the local purchase_order ID link if available.
    # However, if the customer is on a different platform, we'd need their remote PO ID.
    # If we don't store it, we can't sync status back.
    logger.warning(f"Status sync for SO #{so.id} skipped: remote PO ID tracking is missing.")
    return False
