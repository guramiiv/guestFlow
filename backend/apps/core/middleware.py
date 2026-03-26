import uuid


class RequestIDMiddleware:
    """
    Assigns a short unique ID to every request for tracing in logs.
    Exposed as the X-Request-ID response header.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.id = uuid.uuid4().hex[:8]
        response = self.get_response(request)
        response['X-Request-ID'] = request.id
        return response


class SecurityHeadersMiddleware:
    """
    Adds Content-Security-Policy, Permissions-Policy, and Referrer-Policy
    headers to every response. Only active in production (added to MIDDLEWARE
    in config/settings/production.py).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https://res.cloudinary.com https://*.googleapis.com; "
            "font-src 'self'; "
            "connect-src 'self' https://api.guestflow.ge https://res.cloudinary.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self' https://ipay.ge https://ecommerce.tbc.ge;"
        )

        # Permissions Policy
        response['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=(self), '
            'payment=(self "https://ipay.ge" "https://ecommerce.tbc.ge")'
        )

        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        return response
