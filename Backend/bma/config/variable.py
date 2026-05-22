import os
import environ
import certifi
from datetime import timedelta
from pathlib import Path

# Fix for macOS SSL Certificate issue
os.environ['SSL_CERT_FILE'] = certifi.where()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# Core
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)

# Database
DB_HOST = env("DB_HOST", default="localhost")
DB_NAME = env("DB_NAME", default="bma_db")
DB_USER = env("DB_USER", default="postgres")
DB_PASS = env("DB_PASS")
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
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
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

# AI Agent
GOOGLE_MODEL = env("GOOGLE_MODEL", default="gemini-2.0-flash-exp")

# CORS
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
