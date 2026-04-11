from django.core.cache import cache

def invalidate_subscription_cache(subscription):
    if hasattr(subscription, 'business') and subscription.business:
        cache.delete(f"subscription:business:{subscription.business.id}:active")
    cache.delete(f"subscription:usage:{subscription.id}")
