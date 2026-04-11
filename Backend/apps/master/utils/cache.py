import hashlib
import json
from django.core.cache import cache


def make_cache_key(request, base_name, prefix, user):
    params = request.query_params.dict()

    version_key = f"cache_version:{base_name}:{user.business_id}"
    version = cache.get(version_key)

    if version is None:
        version = 1
        cache.set(version_key, version, None)

    raw = {
        "user": user.id,
        "business": user.business_id,
        "branches": list(user.branches.order_by('id').values_list('id', flat=True)) if hasattr(user, 'branches') else [],
        "endpoint": prefix,
        "version": version,
        "params": params,
    }

    encoded = json.dumps(raw, sort_keys=True)
    hashed = hashlib.md5(encoded.encode()).hexdigest()

    return f"{base_name}:{prefix}:{hashed}"

def invalidate_business_cache(base_name, business_id):
    version_key = f"cache_version:{base_name}:{business_id}"
    try:
        cache.incr(version_key)
    except ValueError:
        cache.set(version_key, 2, None)

def invalidate_cache(base_name, prefix, user):
    invalidate_business_cache(base_name, user.business_id)

CURSOR_ORDERINGS = {
    "customer_leaderboard_revenue": ("-total_revenue", "customer_id"),
    "customer_product_preference": ("total_revenue", "customer_id"),

}
