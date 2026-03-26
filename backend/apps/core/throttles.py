from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class BookingCreateThrottle(AnonRateThrottle):
    scope = 'booking_create'


class PaymentThrottle(UserRateThrottle):
    scope = 'payment'
