"""
Production settings for GuestFlow.ge.
"""

from .base import *  # noqa: F401, F403

DEBUG = False

# Allowed hosts
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[  # noqa: F405
    'guestflow.ge',
    'www.guestflow.ge',
    'api.guestflow.ge',
    '.railway.app',
])

# ── HTTPS enforcement ──────────────────────────────────
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# HSTS — tell browsers to ALWAYS use HTTPS
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Prevent clickjacking
X_FRAME_OPTIONS = 'DENY'

# Prevent MIME sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# XSS protection (older browsers)
SECURE_BROWSER_XSS_FILTER = True

# ── CORS — production only allows our domains ──────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[  # noqa: F405
    'https://guestflow.ge',
    'https://www.guestflow.ge',
])
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['X-Request-ID']

# ── Security headers middleware ────────────────────────
MIDDLEWARE.insert(  # noqa: F405
    MIDDLEWARE.index('django.middleware.security.SecurityMiddleware') + 1,  # noqa: F405
    'apps.core.middleware.SecurityHeadersMiddleware',
)
