from bma.config.base import *

# Override properties for local development
DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# (Optional) You can override database or email backend settings here for purely local execution
# EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
