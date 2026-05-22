from django.core.cache import cache


def invalidate_subscription_cache(subscription):
    if not subscription:
        return

    # Use business_id attribute directly if possible to avoid DB query
    business_id = getattr(subscription, "business_id", None)
    if not business_id and hasattr(subscription, "business") and subscription.business:
        business_id = subscription.business.id

    if business_id:
        cache.delete(f"subscription:business:{business_id}:active")
        cache.delete(f"subscription:business:{business_id}:active_instance")

    cache.delete(f"subscription:usage:{subscription.id}")
    cache.delete(f"subscription:usage_instance:{subscription.id}")
