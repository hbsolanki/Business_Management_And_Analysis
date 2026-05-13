from pathlib import Path
from bma.config.variable import *  # noqa: F401, F403 — all env vars loaded here

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
    'apps.base.apps.BaseConfig',
]

INSTALLED_APPS = django_apps + project_app

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

AUTH_USER_MODEL = "user.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
APPEND_SLASH = False

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://bma2-0.d2h4yodyrjngfa.amplifyapp.com'
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
AWS_QUERYSTRING_AUTH = True  # Public URLs (no signed expiry). Set True for private buckets.

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

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True
