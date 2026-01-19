from .base import env

#Email
# EMAIL_BACKEND = env(
#     "EMAIL_BACKEND",
#     default="django.core.mail.backends.console.EmailBackend",
# )
# SMTP config
EMAIL_HOST = env("EMAIL_HOST", default=None)
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)

EMAIL_HOST_USER = env("EMAIL_HOST_USER", default=None)
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default=None)

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default="Dev App <no-reply@localhost>",
)
