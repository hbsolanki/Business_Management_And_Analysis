from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from apps.subscription.models import Subscription, Usage
from apps.product.models import Product
from apps.business.models import Branch
from apps.user.models import User

@receiver(post_save, sender=Subscription)
def enforce_subscription_limits(sender, instance, created, **kwargs):
    business = instance.business

    # Branches
    if instance.max_branches is not None:
        allowed_branches = Branch.objects.filter(business=business).order_by("-is_default", "created_at")[:instance.max_branches]
        allowed_ids = list(allowed_branches.values_list('id', flat=True))
        
        if created:
            Branch.objects.filter(id__in=allowed_ids, is_active=False).update(is_active=True)
            
        Branch.objects.filter(business=business, is_active=True).exclude(id__in=allowed_ids).update(is_active=False)
    elif created:
        Branch.objects.filter(business=business, is_active=False).update(is_active=True)

    # Products
    if instance.max_products is not None:
        allowed_products = Product.objects.filter(business=business).order_by("created_at")[:instance.max_products]
        allowed_ids = list(allowed_products.values_list('id', flat=True))
        
        if created:
            Product.objects.filter(id__in=allowed_ids, is_active=False).update(is_active=True)
            
        Product.objects.filter(business=business, is_active=True).exclude(id__in=allowed_ids).update(is_active=False)
    elif created:
        Product.objects.filter(business=business, is_active=False).update(is_active=True)

    # Staff (Users)
    if instance.max_staff is not None:
        allowed_staff = User.objects.filter(
            business_roles__business=business
        ).exclude(business_roles__role='OWNER').order_by("created_at")[:instance.max_staff]
        allowed_ids = list(allowed_staff.values_list('id', flat=True))

        if created:
            User.objects.filter(id__in=allowed_ids, is_active=False).update(is_active=True)

        User.objects.filter(
            business_roles__business=business, is_active=True
        ).exclude(business_roles__role='OWNER').exclude(id__in=allowed_ids).update(is_active=False)
    elif created:
        User.objects.filter(business_roles__business=business, is_active=False).update(is_active=True)
        # --- 4. Sync Usage ---
    usage = Usage.objects.filter(subscription=instance).first()
    if not usage:
        usage = Usage.objects.create(subscription=instance)
        
    usage.branches_created = Branch.objects.filter(business=business, is_active=True).count()
    usage.product_created = Product.objects.filter(business=business, is_active=True).count()
    usage.staff_created = User.objects.filter(
        business_roles__business=business, is_active=True
    ).exclude(business_roles__role='OWNER').count()
    usage.save(update_fields=['branches_created', 'product_created', 'staff_created'])

#
# @receiver(post_migrate)
# def setup_periodic_tasks(sender, **kwargs):
#     if sender.name == 'apps.subscription':
#         try:
#             from django_celery_beat.models import PeriodicTask, CrontabSchedule
#
#             # Create a daily midnight schedule
#             schedule, _ = CrontabSchedule.objects.get_or_create(
#                 minute='0',
#                 hour='0',
#                 day_of_week='*',
#                 day_of_month='*',
#                 month_of_year='*',
#             )
#
#             # Deactivate expired subscriptions task
#             PeriodicTask.objects.update_or_create(
#                 name='Deactivate Expired Subscriptions (Daily)',
#                 defaults={
#                     'crontab': schedule,
#                     'task': 'apps.subscription.tasks.deactivate_expired_subscriptions',
#                 }
#             )
#         except Exception as e:
#             # Handle cases where django_celery_beat is not installed or models aren't ready
#             print(f"Warning: Could not set up periodic tasks. Exception: {e}")
