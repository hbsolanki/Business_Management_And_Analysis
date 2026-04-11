import hashlib
import json


def make_cache_key(request, prefix, user):
    params = request.query_params.dict()

    raw = {
        "business": user.business_id,
        "endpoint": prefix,
        "params": params,
    }

    encoded = json.dumps(raw, sort_keys=True)
    return f"analytics:{hashlib.md5(encoded.encode()).hexdigest()}"


CURSOR_ORDERINGS = {
    "customer_leaderboard_revenue": ("-total_revenue", "customer_id"),
    "customer_product_preference": ("-total_revenue", "customer_id"),

}