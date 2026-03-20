"""
Production settings for GuestFlow.ge.
"""

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')  # noqa: F405

# CORS — only allow specific origins
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])  # noqa: F405

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
