import logging

from rest_framework.views import exception_handler

logger = logging.getLogger('security')


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Never expose stack traces in production
        if response.status_code >= 500:
            response.data = {
                'error': 'შეცდომა მოხდა. გთხოვთ სცადოთ მოგვიანებით.',
                'error_en': 'An error occurred. Please try again later.',
            }

        # Log 403/404 on authenticated endpoints (possible tenant probing)
        if response.status_code in (403, 404):
            request = context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                logger.warning(
                    'Access denied: user=%s path=%s method=%s status=%s',
                    request.user.email,
                    request.path,
                    request.method,
                    response.status_code,
                )

    return response
