import logging
from celery import shared_task
from django.db import transaction
from apps.supplier.models import SalesOrder
from apps.invoice.serializers.invoice import InvoiceSerializer
from apps.inventory.models import Inventory

logger = logging.getLogger(__name__)

class MockRequest:
    """Mock request object for serializer context."""
    def __init__(self, user):
        self.user = user

@shared_task
def create_invoice_from_sales_order_task(sales_order_id):
    """
    Creates an Invoice and its items from a Sales Order using a serializer.
    This ensures that data validation and inventory updates are handled correctly.
    """
    try:
        sales_order = SalesOrder.objects.select_related('business', 'branch', 'customer', 'created_by').get(id=sales_order_id)
    except SalesOrder.DoesNotExist:
        logger.error(f"Invoice creation failed: SalesOrder #{sales_order_id} not found.")
        return

    # 1. Prepare data for InvoiceSerializer
    invoice_data = {
        "branch_id": sales_order.branch.id if sales_order.branch else None,
        "customer": {
            "name": sales_order.customer.name,
            "mobile_number": sales_order.customer.mobile_number,
            "gender": sales_order.customer.gender,
            "age": sales_order.customer.age,
            "email": sales_order.customer.email,
            "same_platform": sales_order.customer.same_platform,
            "customer_business_id": sales_order.customer.customer_business.id if sales_order.customer.customer_business else None
        },
        "invoice_items": [
            {
                "product_id": item.product.id,
                "quantity": item.quantity
            }
            for item in sales_order.items.all()
        ],
        "sales_order": sales_order.id,
        "payment_mode": "CASH",  # Default for delivered orders
        "notes": f"Auto-generated from Sales Order #{sales_order.id}"
    }

    # 2. Mock request and context
    request = MockRequest(sales_order.created_by)
    inventory = Inventory.objects.filter(business=sales_order.business, branch=sales_order.branch).first()
    
    context = {
        'request': request,
        'inventory': inventory
    }

    try:
        # 3. Use Serializer to Validate and Create
        serializer = InvoiceSerializer(data=invoice_data, context=context)
        if serializer.is_valid():
            with transaction.atomic():
                invoice = serializer.save()
                logger.info(f"Successfully created Invoice #{invoice.id} from SalesOrder #{sales_order_id} using serializer.")
                return f"Invoice #{invoice.id} created"
        else:
            logger.error(f"Serializer validation failed for SalesOrder #{sales_order_id}: {serializer.errors}")
            return f"Validation Error: {serializer.errors}"

    except Exception as e:
        logger.error(f"Unexpected error in create_invoice_from_sales_order_task for SO #{sales_order_id}: {str(e)}")
        raise
