from pathlib import Path
import environ
import os

env = environ.Env(
    DEBUG=(bool, False)
)
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

MEDIA_URL = env("MEDIA_URL")
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")

CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND")

CELERY_ACCEPT_CONTENT = env("CELERY_ACCEPT_CONTENT").split(",")
CELERY_TASK_SERIALIZER = env("CELERY_TASK_SERIALIZER")

CELERY_TIMEZONE = env("CELERY_TIMEZONE")
CELERY_TASK_TRACK_STARTED = env.bool("CELERY_TASK_TRACK_STARTED", default=True)
CELERY_TASK_TIME_LIMIT = env.int("CELERY_TASK_TIME_LIMIT", default=1800)
