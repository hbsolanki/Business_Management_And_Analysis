from apps.subscription.utils.entitlements import (
    get_active_subscription,
    increment_usage,
)


def staff_usage_subscription(business):
    """Increment staff created count for the current subscription."""
    subscription = get_active_subscription(business)
    if subscription:
        increment_usage(subscription, "staff_created")
