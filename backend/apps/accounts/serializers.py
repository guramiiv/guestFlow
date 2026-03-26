import logging

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'language', 'is_property_owner')
        read_only_fields = ('id', 'email')


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, default='')

    def validate_email(self, value):
        from apps.core.validators import normalize_email
        value = normalize_email(value)
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('ეს ელ. ფოსტა უკვე გამოყენებულია.')
        return value

    def validate_phone(self, value):
        from apps.core.validators import validate_phone
        return validate_phone(value)

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
        )

        # Auto-create a default property for the new owner
        from apps.properties.models import Property
        Property.objects.create(
            owner=user,
            name_ka='ჩემი სასტუმრო',
            address_ka='',
            city='',
            region='tbilisi',
            phone=user.phone,
            email=user.email,
        )

        return user

    def to_representation(self, user):
        refresh = RefreshToken.for_user(user)
        return {
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
        }


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


def _get_client_ip(request):
    """Extract client IP from request, respecting X-Forwarded-For."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT token serializer to:
    - Add custom claims (user_id, email, property_id) to the token
    - Log successful and failed login attempts with IP and user agent
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['user_id'] = user.id
        prop = user.properties.first()
        if prop:
            token['property_id'] = prop.id
        return token

    def validate(self, attrs):
        request = self.context.get('request')
        ip = _get_client_ip(request) if request else 'unknown'
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        email = attrs.get('email', '')

        try:
            data = super().validate(attrs)
            logger.info(
                'Login success: email=%s ip=%s ua=%s',
                email, ip, user_agent[:200],
            )
            return data
        except Exception:
            logger.warning(
                'Login failed: email=%s ip=%s ua=%s',
                email, ip, user_agent[:200],
            )
            raise
