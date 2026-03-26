from datetime import date, timedelta
from decimal import Decimal

from rest_framework import serializers

from apps.core.validators import normalize_email, sanitize_text, validate_phone
from .models import Booking, RoomNight
from apps.guests.models import Guest
from apps.properties.models import Property, Room, SeasonalRate


class BookingSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name_ka', read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'property', 'room', 'room_name', 'guest', 'source', 'external_id',
            'status', 'check_in', 'check_out', 'num_guests', 'num_nights',
            'total_price_gel', 'paid_amount_gel', 'payment_status', 'payment_method',
            'guest_name', 'guest_phone', 'guest_email', 'guest_country',
            'notes', 'guest_message', 'cancellation_reason', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'num_nights', 'property', 'created_at', 'updated_at')


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = (
            'id', 'room', 'guest', 'source', 'external_id', 'status',
            'check_in', 'check_out', 'num_guests', 'num_nights',
            'total_price_gel', 'paid_amount_gel', 'payment_status', 'payment_method',
            'guest_name', 'guest_phone', 'guest_email', 'guest_country',
            'notes', 'guest_message',
        )
        read_only_fields = ('id', 'num_nights')

    def validate_room(self, value):
        """Ensure the room belongs to the requesting user's property."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if value.property.owner != request.user:
                raise serializers.ValidationError("Room not found.")
        return value

    def validate_guest_phone(self, value):
        return validate_phone(value)

    def validate_guest_email(self, value):
        return normalize_email(value)

    def validate_notes(self, value):
        return sanitize_text(value)

    def validate_guest_message(self, value):
        return sanitize_text(value)

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        room = data.get('room')

        if check_out and check_in and check_out <= check_in:
            raise serializers.ValidationError(
                {'check_out': 'გასვლის თარიღი უნდა იყოს ჩასახლების შემდეგ.'}
            )

        if room and check_in and check_out:
            available, occupied_dates = Booking.check_availability(
                room.id, check_in, check_out
            )
            if not available:
                raise serializers.ValidationError(
                    {'check_in': f'ოთახი ამ თარიღებში დაკავებულია: {occupied_dates}'}
                )

        return data


class BookingCalendarSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name_ka', read_only=True)

    class Meta:
        model = Booking
        fields = ('id', 'room', 'room_name', 'guest_name', 'check_in', 'check_out', 'status', 'source')


class RecordPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(
        choices=Booking.PAYMENT_METHOD_CHOICES, required=False
    )


# ──────────────────────────────────────────────
# Public (unauthenticated) serializers
# ──────────────────────────────────────────────

def _get_effective_price(room, for_date=None):
    """Return the seasonal rate for the given date, or base_price_gel."""
    if for_date is None:
        for_date = date.today()
    seasonal = SeasonalRate.objects.filter(
        room=room, start_date__lte=for_date, end_date__gte=for_date
    ).first()
    return seasonal.price_gel if seasonal else room.base_price_gel


class PublicPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = (
            'name_ka', 'name_en', 'slug', 'property_type',
            'description_ka', 'description_en', 'address_ka', 'city', 'region',
            'phone', 'whatsapp', 'email',
            'check_in_time', 'check_out_time',
            'house_rules_ka', 'house_rules_en',
            'amenities', 'photos', 'banner_photo', 'latitude', 'longitude',
        )
        read_only_fields = fields


class PublicRoomSerializer(serializers.ModelSerializer):
    effective_price_gel = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            'id', 'name_ka', 'name_en', 'room_type', 'max_guests',
            'base_price_gel', 'description_ka', 'description_en',
            'amenities', 'photos', 'effective_price_gel', 'is_available',
        )
        read_only_fields = fields

    def get_effective_price_gel(self, obj):
        return str(_get_effective_price(obj))

    def get_is_available(self, obj):
        request = self.context.get('request')
        if not request:
            return True
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')
        if not check_in or not check_out:
            return True
        available, _ = Booking.check_availability(obj.id, check_in, check_out)
        return available


class PublicAvailabilitySerializer(serializers.Serializer):
    room = PublicRoomSerializer(read_only=True)
    price_per_night_gel = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price_gel = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    nights = serializers.IntegerField(read_only=True)


class PublicBookingCreateSerializer(serializers.Serializer):
    room_id = serializers.IntegerField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    num_guests = serializers.IntegerField(min_value=1)
    guest_name = serializers.CharField(max_length=200)
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20, required=False, default='')
    guest_country = serializers.CharField(max_length=2, required=False, default='')
    guest_language = serializers.CharField(max_length=2, required=False, default='en')
    guest_message = serializers.CharField(required=False, default='')
    payment_method = serializers.ChoiceField(choices=[('bog_ipay', 'BOG iPay'), ('pay_at_property', 'Pay at Property')])

    def validate_guest_phone(self, value):
        return validate_phone(value)

    def validate_guest_email(self, value):
        return normalize_email(value)

    def validate_guest_name(self, value):
        return sanitize_text(value)

    def validate_guest_message(self, value):
        return sanitize_text(value)

    def validate(self, data):
        slug = self.context.get('slug')
        try:
            prop = Property.objects.get(slug=slug, is_active=True)
        except Property.DoesNotExist:
            raise serializers.ValidationError({'property': 'Property not found.'})
        data['property'] = prop

        try:
            room = Room.objects.get(id=data['room_id'], property=prop, is_active=True)
        except Room.DoesNotExist:
            raise serializers.ValidationError({'room_id': 'Room not found for this property.'})
        data['room'] = room

        if data['check_out'] <= data['check_in']:
            raise serializers.ValidationError(
                {'check_out': 'Check-out must be after check-in.'}
            )
        if data['check_in'] < date.today():
            raise serializers.ValidationError(
                {'check_in': 'Check-in cannot be in the past.'}
            )
        if data['num_guests'] > room.max_guests:
            raise serializers.ValidationError(
                {'num_guests': f'Maximum {room.max_guests} guests allowed for this room.'}
            )

        available, _ = Booking.check_availability(room.id, data['check_in'], data['check_out'])
        if not available:
            raise serializers.ValidationError(
                {'room': 'ოთახი ამ თარიღებში დაკავებულია / Room is not available for selected dates'}
            )

        return data

    def create(self, validated_data):
        prop = validated_data['property']
        room = validated_data['room']
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        num_nights = (check_out - check_in).days

        # Get or create guest
        guest, _ = Guest.objects.get_or_create(
            property=prop,
            email=validated_data['guest_email'],
            defaults={
                'first_name': validated_data['guest_name'].split()[0] if validated_data['guest_name'] else '',
                'last_name': ' '.join(validated_data['guest_name'].split()[1:]) if len(validated_data['guest_name'].split()) > 1 else '',
                'phone': validated_data.get('guest_phone', ''),
                'country': validated_data.get('guest_country', ''),
                'language': validated_data.get('guest_language', 'en'),
            },
        )

        # Calculate total price using effective rate per night
        total = Decimal('0')
        for i in range(num_nights):
            night_date = check_in + timedelta(days=i)
            total += _get_effective_price(room, night_date)

        status = 'confirmed' if validated_data['payment_method'] == 'pay_at_property' else 'pending'

        booking = Booking(
            property=prop,
            room=room,
            guest=guest,
            source='direct',
            status=status,
            check_in=check_in,
            check_out=check_out,
            num_guests=validated_data['num_guests'],
            total_price_gel=total,
            paid_amount_gel=Decimal('0'),
            payment_status='unpaid',
            payment_method=validated_data['payment_method'] if validated_data['payment_method'] != 'pay_at_property' else '',
            guest_name=validated_data['guest_name'],
            guest_phone=validated_data.get('guest_phone', ''),
            guest_email=validated_data['guest_email'],
            guest_country=validated_data.get('guest_country', ''),
            guest_message=validated_data.get('guest_message', ''),
        )
        booking.save()  # save() creates RoomNight entries automatically

        return booking


class PublicBookingConfirmationSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name_ka', read_only=True)
    room_name = serializers.CharField(source='room.name_ka', read_only=True)
    confirmation_code = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'id', 'property_name', 'room_name', 'guest_name',
            'check_in', 'check_out', 'num_nights', 'num_guests',
            'total_price_gel', 'payment_status', 'status', 'confirmation_code',
        )
        read_only_fields = fields

    def get_confirmation_code(self, obj):
        return str(obj.id).zfill(8)[-8:]
