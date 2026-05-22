from django.utils import timezone
from django.core.cache import cache
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import PermissionDenied
from apps.subscription.models import Subscription, Usage


def get_active_subscription(business):
    """
    Get the active subscription for a business using cache.
    """
    if not business:
        return None

    cache_key = f"subscription:business:{business.id}:active_instance"
    cached_subscription = cache.get(cache_key)
    if cached_subscription is not None:
        return cached_subscription

    now = timezone.now()
    subscription = (
        Subscription.objects.filter(
            business=business, is_active=True, start_date__lte=now, end_date__gte=now
        )
        .select_related("plan")
        .first()
    )

    if subscription:
        # Calculate exactly how many seconds are left until expiration
        seconds_left = (subscription.end_date - now).total_seconds()
        # Cache for a maximum of 10 minutes (600s), or exactly until expiration
        ttl = max(1, min(600, int(seconds_left)))
        cache.set(cache_key, subscription, timeout=ttl)
    else:
        # Cache the absence of subscription for 60 seconds
        cache.set(cache_key, None, timeout=60)

    return subscription


def get_subscription_usage(subscription):
    """
    Get the usage instance for a subscription using cache.
    """
    if not subscription:
        return None

    def get_or_create_usage():
        usage, _ = Usage.objects.get_or_create(subscription=subscription)
        return usage

    cache_key = f"subscription:usage_instance:{subscription.id}"
    return cache.get_or_set(cache_key, get_or_create_usage, timeout=180)


def check_feature(business, feature_field: str):
    """
    Check if a feature is enabled in the business's active plan.
    Raises PermissionDenied if not.
    """
    subscription = get_active_subscription(business)
    if not subscription:
        raise PermissionDenied("No active subscription")

    allowed = getattr(subscription, feature_field)
    if allowed is None:
        allowed = getattr(subscription.plan, feature_field, False)

    if not allowed:
        raise PermissionDenied("This feature is not available in your current plan")
    return True


def can_use_feature(business, feature_name, usage_field=None):
    """
    Boolean check for feature availability and usage limits.
    Returns (allowed: bool, message: str/bool)
    """
    subscription = get_active_subscription(business)
    if not subscription:
        return False, "No active subscription"

    if usage_field is None:
        allow = getattr(subscription, feature_name)
        if allow is None:
            allow = getattr(subscription.plan, feature_name, False)

        if not allow:
            return False, f"{feature_name} not allowed in your plan"
        return True, True

    limit = getattr(subscription, feature_name)
    if limit is None:
        limit = getattr(subscription.plan, feature_name, None)

    if limit is None:
        return True, True

    usage = get_subscription_usage(subscription)

    current = getattr(usage, usage_field)
    if current >= limit:
        return False, f"{feature_name} limit reached"

    return True, True


def check_resource_limit(business, model, limit_field: str):
    """
    Check if the business has reached a resource limit (e.g., product count).
    If there is no active subscription, allow a default limit of 1.
    """
    subscription = get_active_subscription(business)

    if not subscription:
        limit = 1
    else:
        limit = getattr(subscription, limit_field)
        if limit is None:
            limit = getattr(subscription.plan, limit_field, None)

    if limit is None:
        return True

    if model.__name__ == "User":
        qs = model.objects.filter(
            business_roles__business=business, is_active=True
        ).exclude(business_roles__role="OWNER")
    else:
        qs = model.objects.filter(business=business, is_active=True)

    current_count = qs.count()
    if current_count >= limit:
        raise PermissionDenied(
            f"Limit reached ({current_count}/{limit}). "
            f"Upgrade your plan or deactivate items."
        )

    return True


def check_monthly_quota(business, quota_field: str, usage_field: str):
    """
    Check if the business has exceeded its monthly quota for a specific field.
    """
    subscription = get_active_subscription(business)
    if not subscription:
        raise PermissionDenied("No active subscription")

    limit = getattr(subscription, quota_field)
    if limit is None:
        limit = getattr(subscription.plan, quota_field, None)

    if limit is None:
        return True

    usage = get_subscription_usage(subscription)
    current = getattr(usage, usage_field)

    if current >= limit:
        raise PermissionDenied("Monthly quota exceeded")

    return True


def increment_usage(subscription, usage_field: str):
    """
    Safely increment usage for a specific field.
    """
    with transaction.atomic():
        # Lock the subscription row to serialize usage increments
        sub = Subscription.objects.select_for_update().get(id=subscription.id)
        usage, _ = Usage.objects.get_or_create(subscription=sub)
        Usage.objects.filter(pk=usage.pk).update(**{usage_field: F(usage_field) + 1})

    cache.delete(f"subscription:usage:{subscription.id}")
    cache.delete(f"subscription:usage_instance:{subscription.id}")
