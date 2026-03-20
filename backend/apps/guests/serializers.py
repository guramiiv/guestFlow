from rest_framework import serializers

from apps.bookings.serializers import BookingCalendarSerializer
from .models import Guest


class GuestSerializer(serializers.ModelSerializer):
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


class GuestDetailSerializer(serializers.ModelSerializer):
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
