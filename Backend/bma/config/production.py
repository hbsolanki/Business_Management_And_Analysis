from .base import *

# Ensure Debug is turned off in production
DEBUG = env.bool("DEBUG", default=False)

# In production, we assume that ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS 
# are explicitly provided or fallback to a secure default
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=['*'])

CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Example Production security settings
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

# If serving over HTTPS
# SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
# SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
# CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
