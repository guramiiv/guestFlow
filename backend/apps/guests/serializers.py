from rest_framework import serializers

from apps.bookings.serializers import BookingCalendarSerializer
from apps.core.validators import normalize_email, sanitize_text, validate_phone
from .models import Guest


class GuestSerializer(serializers.ModelSerializer):
    """List serializer — id_number is masked for security."""
    full_name = serializers.CharField(read_only=True)
    id_number = serializers.CharField(source='id_number_masked', read_only=True)

    class Meta:
        model = Guest
        fields = (
            'id', 'property', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'country', 'language',
            'id_type', 'id_number',
            'total_stays', 'total_spent_gel',
            'notes', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'property', 'total_stays', 'total_spent_gel', 'created_at', 'updated_at')


class GuestCreateUpdateSerializer(serializers.ModelSerializer):
    """Write serializer — accepts full id_number for create/update."""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Guest
        fields = (
            'id', 'property', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'country', 'language',
            'id_type', 'id_number',
            'total_stays', 'total_spent_gel',
            'notes', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'property', 'total_stays', 'total_spent_gel', 'created_at', 'updated_at')

    def validate_phone(self, value):
        return validate_phone(value)

    def validate_email(self, value):
        return normalize_email(value)

    def validate_notes(self, value):
        return sanitize_text(value)


class GuestDetailSerializer(serializers.ModelSerializer):
    """Detail serializer — full id_number visible (access is audit-logged in the view)."""
    full_name = serializers.CharField(read_only=True)
    recent_bookings = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = (
            'id', 'property', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'country', 'language',
            'id_type', 'id_number',
            'total_stays', 'total_spent_gel',
            'notes', 'created_at', 'updated_at',
            'recent_bookings',
        )
        read_only_fields = ('id', 'property', 'total_stays', 'total_spent_gel', 'created_at', 'updated_at')

    def get_recent_bookings(self, obj):
        bookings = obj.bookings.order_by('-created_at')[:10]
        return BookingCalendarSerializer(bookings, many=True).data
