from django.core.cache import cache

ONLINE_TTL = 60


def presence_key(business_id, user_id):
    return f"presence:{business_id}:{user_id}"

def set_user_online(business_id, user_id):
    cache.set(presence_key(business_id, user_id), True, timeout=ONLINE_TTL)


def refresh_user_online(business_id, user_id):
    cache.touch(presence_key(business_id, user_id), timeout=ONLINE_TTL)

def set_user_offline(business_id, user_id):
    cache.delete(presence_key(business_id, user_id))

def is_user_online(business_id, user_id):
    return cache.get(presence_key(business_id, user_id)) is True