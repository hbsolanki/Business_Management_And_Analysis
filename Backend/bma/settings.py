import os
import environ
import certifi
from pathlib import Path
from datetime import timedelta

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False)
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# Fix for macOS SSL Certificate issue
os.environ['SSL_CERT_FILE'] = certifi.where()

# --- Environment Variables ---
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)

# Database
DB_HOST = env("DB_HOST", default="localhost")
DB_NAME = env("DB_NAME", default="bma_db")
DB_USER = env("DB_USER", default="postgres")
DB_PASS = env("DB_PASS", default="")
DB_PORT = env("DB_PORT", default="5432")
DB_SSLMODE = env("DB_SSLMODE", default="prefer")

# Redis & Celery
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379")
REDIS_PASSWORD = env("REDIS_PASSWORD", default=None)
CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND")
CELERY_ACCEPT_CONTENT = env.list("CELERY_ACCEPT_CONTENT", default=["json"])
CELERY_TASK_SERIALIZER = env("CELERY_TASK_SERIALIZER", default="json")
CELERY_TIMEZONE = env("CELERY_TIMEZONE", default="UTC")
CELERY_TASK_TRACK_STARTED = env.bool("CELERY_TASK_TRACK_STARTED", default=True)
CELERY_TASK_TIME_LIMIT = env.int("CELERY_TASK_TIME_LIMIT", default=1800)

# Media & AWS S3
MEDIA_URL = env("MEDIA_URL", default="/media/")
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-south-1")
AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default=None)
AWS_S3_FILE_OVERWRITE = env.bool("AWS_S3_FILE_OVERWRITE", default=False)
AWS_DEFAULT_ACL = env("AWS_DEFAULT_ACL", default=None)

# Google OAuth
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET")

# Stripe
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET")

# Email / Brevo
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp-relay.brevo.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="apikey")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")
DEFAULT_FROM_NAME_EMAIL = env("DEFAULT_FROM_NAME_EMAIL")
BREVO_API_KEY = env("BREVO_API_KEY")

# JWT token lifetimes
ACCESS_TOKEN_LIFETIME_DURATION = timedelta(minutes=env.int("ACCESS_TOKEN_LIFETIME", default=5))
REFRESH_TOKEN_LIFETIME_DURATION = timedelta(days=env.int("REFRESH_TOKEN_LIFETIME", default=1))

# --- Django Settings ---
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=['*'])

INSTALLED_APPS = [
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
    
    # Project Apps
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
    'apps.base.apps.BaseConfig',
    'apps.gst_management.apps.GstManagementConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
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

# Security for ALB/ELB
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

AUTH_USER_MODEL = "user.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
APPEND_SLASH = False

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": DB_NAME,
        "USER": DB_USER,
        "PASSWORD": DB_PASS,
        "HOST": DB_HOST,
        "PORT": DB_PORT,
        "OPTIONS": {
            "sslmode": DB_SSLMODE,
        },
    }
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

if REDIS_PASSWORD:
    CACHES["default"]["OPTIONS"]["PASSWORD"] = REDIS_PASSWORD

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
            "capacity": 1000,
            "expiry": 10,
        },
    },
}

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = []

MEDIA_ROOT = BASE_DIR / "media"

# AWS S3 Storage
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",
}
AWS_QUERYSTRING_AUTH = True

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": AWS_ACCESS_KEY_ID,
            "secret_key": AWS_SECRET_ACCESS_KEY,
            "bucket_name": AWS_STORAGE_BUCKET_NAME,
            "region_name": AWS_S3_REGION_NAME,
            "custom_domain": AWS_S3_CUSTOM_DOMAIN,
            "file_overwrite": AWS_S3_FILE_OVERWRITE,
            "default_acl": AWS_DEFAULT_ACL,
            "object_parameters": {"CacheControl": "max-age=86400"},
            "querystring_auth": True,
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

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

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# --- Security & Origin Settings ---
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"])

CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

# Combine .env origins with defaults
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

if DEBUG:
    # Ensure local development origins are always present in DEBUG mode
    dev_origins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://0.0.0.0:5173']
    for origin in dev_origins:
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)
    
    CORS_ALLOW_ALL_ORIGINS = True

# Production security
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
