from apps.subscription.models import Subscription, Usage
from django.core.cache import cache

def staff_usage_subscription(business):
    """Increment staff created count for the current subscription."""
    from apps.subscription.utils.entitlements import get_active_subscription
    subscription = get_active_subscription(business)
    if subscription:
        usage, _ = Usage.objects.get_or_create(subscription=subscription)
        usage.staff_created += 1
        usage.save(update_fields=["staff_created"])
        cache.delete(f"subscription:usage:{subscription.id}")
