from django.http import JsonResponse
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.core.throttles import LoginRateThrottle, RegisterRateThrottle

from .models import User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Accepts a refresh token and adds it to the blacklist,
    preventing further use of that token pair.
    """

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            # Token is already blacklisted or invalid — still a successful logout
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


def axes_lockout_response(request, credentials, *args, **kwargs):
    """Custom response when django-axes locks out a user after too many failed attempts."""
    return JsonResponse(
        {
            'error': 'ანგარიში დროებით დაბლოკილია. სცადეთ 15 წუთში.',
            'error_en': 'Account temporarily locked. Try again in 15 minutes.',
        },
        status=429,
    )
