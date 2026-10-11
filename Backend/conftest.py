import pytest

@pytest.fixture(autouse=True)
def test_environment_settings(settings):
    # 1. Fast password hashing for tests (dramatically speeds up user creation)
    settings.PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]

    # 2. Celery & Async settings
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_BROKER_URL = 'memory://'
    settings.CELERY_RESULT_BACKEND = 'cache'
    settings.CELERY_CACHE_BACKEND = 'default'

    # 3. Fast In-Memory caching & channels
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

@pytest.fixture(autouse=True)
def clear_cache():
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()

