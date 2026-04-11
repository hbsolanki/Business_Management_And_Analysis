from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Q
from apps.inventory.models import InventoryProduct
from apps.notification.utils import send_notification
from apps.notification.models import Notification
from apps.user.models import User
from apps.employee.models import UserRole, WorkType

@receiver(post_save, sender=InventoryProduct)
def check_low_stock(sender, instance, **kwargs):
    product = instance.product
    low_limit = product.low_stock_limit
    
    # Check if stock has reached or fallen below the limit
    if low_limit is not None and instance.stock_quantity <= low_limit:
        branch = instance.inventory.branch
        business = instance.inventory.business
        
        # Identify recipients: Branch managers and employees assigned to Inventory
        recipients = User.objects.filter(
            business_roles__business=business,
            assigned_branches__branch=branch,
            is_active=True
        ).filter(
            Q(business_roles__role=UserRole.MANAGER) |
            Q(business_roles__role=UserRole.EMPLOYEE, branch_works__work_type=WorkType.INVENTORY, branch_works__branch=branch)
        ).distinct()

        title = f"Low Stock Alert: {product.name}"
        content = (
            f"The stock for '{product.name}' in branch '{branch.name}' "
            f"has reached {instance.stock_quantity}, which is at or below "
            f"the limit of {low_limit}."
        )

        for user in recipients:
            send_notification(
                user=user,
                title=title,
                content=content,
                action_type=Notification.ActionType.LOW_STOCK_ALERT,
                action_link=f"/inventory/stock?branch={branch.id}"
            )
