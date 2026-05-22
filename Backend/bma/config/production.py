from bma.config.base import *  # noqa: F401, F403

# Production-only security settings
DEBUG = False

SECURE_BROWSER_XSS_FILTER = True  # Enable browser XSS filter
X_FRAME_OPTIONS = 'DENY'  # Prevent iframe clickjacking
SECURE_CONTENT_TYPE_NOSNIFF = True  # Prevent MIME type sniffing
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # Force HTTPS connections only
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # Trust proxy HTTPS header
