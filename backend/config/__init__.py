try:
    from .celery import app as celery_app
    __all__ = ['celery_app']
except ImportError:
    # celery not installed — safe to skip in dev
    celery_app = None
    __all__ = []
