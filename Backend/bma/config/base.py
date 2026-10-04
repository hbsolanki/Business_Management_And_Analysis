from pathlib import Path
from bma.config.variable import *  # noqa: F401, F403 — all env vars loaded here
from bma.config.storage import *   # noqa: F401, F403 — database, redis, s3 storage

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Application definition
django_apps = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    'rest_framework',
    'django_celery_beat',
    'drf_spectacular',
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    'channels',
    'storages',
    'cloudinary_storage',
    'cloudinary',
]

project_app = [
    'apps.user',
    'apps.business',
    'apps.product',
    'apps.inventory',
    'apps.invoice',
    'apps.analytics',
    'apps.cost',
    'apps.chat',
    'apps.tasks',
    'apps.notification',
    'apps.subscription',
    'apps.activity_log',
    'apps.master',
    'apps.supplier',
    'apps.employee',
    'apps.ai_agent',
    'apps.payment',
    'apps.base.apps.BaseConfig',
    'apps.gst_management.apps.GstManagementConfig',
]

INSTALLED_APPS = django_apps + project_app

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "bma.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "bma.wsgi.application"
ASGI_APPLICATION = "bma.asgi.application"

AUTH_USER_MODEL = "user.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
APPEND_SLASH = False

# Security settings for ALB (HTTPS Proxy)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CORS_ALLOW_CREDENTIALS = True
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"])

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://bma2-0.d2h4yodyrjngfa.amplifyapp.com',
    ]
)

# Storage settings (Database, Redis, S3) are in bma/config/storage.py

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = []

MEDIA_ROOT = BASE_DIR / "media"

CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "cleanup-stale-pending-payments-nightly": {
        "task": "apps.payment.tasks.cleanup_stale_pending_payments",
        "schedule": crontab(hour=2, minute=0),  # Runs daily at 2:00 AM at night
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": ACCESS_TOKEN_LIFETIME_DURATION,
    "REFRESH_TOKEN_LIFETIME": REFRESH_TOKEN_LIFETIME_DURATION,
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'BMA API',
    'DESCRIPTION': 'Business Management and Analysis API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,
    },
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# Logging for CloudWatch (stdout)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': env('DJANGO_LOG_LEVEL', default='INFO'),
    },
}
