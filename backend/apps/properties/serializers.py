from rest_framework import serializers

from apps.core.validators import normalize_email, sanitize_text, validate_phone
from .models import ChannelConnection, Property, Room, SeasonalRate


class SeasonalRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeasonalRate
        fields = ('id', 'name_ka', 'start_date', 'end_date', 'price_gel', 'min_stay')


class RoomSerializer(serializers.ModelSerializer):
    seasonal_rates = SeasonalRateSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = (
            'id', 'name_ka', 'name_en', 'room_type', 'max_guests',
            'base_price_gel', 'description_ka', 'description_en',
            'amenities', 'photos', 'floor', 'is_active', 'sort_order',
            'seasonal_rates', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class RoomCreateSerializer(serializers.ModelSerializer):
    seasonal_rates = SeasonalRateSerializer(many=True, required=False)

    class Meta:
        model = Room
        fields = (
            'id', 'name_ka', 'name_en', 'room_type', 'max_guests',
            'base_price_gel', 'description_ka', 'description_en',
            'amenities', 'photos', 'floor', 'is_active', 'sort_order',
            'seasonal_rates',
        )
        read_only_fields = ('id',)

    def create(self, validated_data):
        rates_data = validated_data.pop('seasonal_rates', [])
        room = Room.objects.create(**validated_data)
        for rate_data in rates_data:
            SeasonalRate.objects.create(room=room, **rate_data)
        return room

    def update(self, instance, validated_data):
        rates_data = validated_data.pop('seasonal_rates', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if rates_data is not None:
            instance.seasonal_rates.all().delete()
            for rate_data in rates_data:
                SeasonalRate.objects.create(room=instance, **rate_data)

        return instance


class PropertySerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = (
            'id', 'name_ka', 'name_en', 'slug', 'property_type',
            'description_ka', 'description_en', 'address_ka', 'city', 'region',
            'latitude', 'longitude', 'phone', 'whatsapp', 'email',
            'check_in_time', 'check_out_time', 'house_rules_ka', 'house_rules_en',
            'tax_id', 'amenities', 'photos', 'banner_photo', 'plan', 'is_active',
            'rooms', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'slug', 'plan', 'created_at', 'updated_at')


class PropertyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = (
            'name_ka', 'name_en', 'property_type',
            'description_ka', 'description_en', 'address_ka', 'city', 'region',
            'latitude', 'longitude', 'phone', 'whatsapp', 'email',
            'check_in_time', 'check_out_time', 'house_rules_ka', 'house_rules_en',
            'tax_id', 'amenities', 'photos', 'banner_photo',
        )

    def validate_phone(self, value):
        return validate_phone(value)

    def validate_whatsapp(self, value):
        return validate_phone(value)

    def validate_email(self, value):
        return normalize_email(value)

    def validate_description_ka(self, value):
        return sanitize_text(value)

    def validate_description_en(self, value):
        return sanitize_text(value)

    def validate_house_rules_ka(self, value):
        return sanitize_text(value)

    def validate_house_rules_en(self, value):
        return sanitize_text(value)


class ChannelConnectionSerializer(serializers.ModelSerializer):
    """Read serializer — NEVER exposes api_key or api_secret."""
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)

    class Meta:
        model = ChannelConnection
        fields = (
            'id', 'channel', 'channel_display', 'property_external_id',
            'sync_status', 'last_sync_at', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class ChannelConnectionCreateSerializer(serializers.ModelSerializer):
    """Write serializer — accepts credentials but never returns them."""
    api_key = serializers.CharField(write_only=True)
    api_secret = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = ChannelConnection
        fields = (
            'id', 'channel', 'property_external_id',
            'api_key', 'api_secret',
        )
        read_only_fields = ('id',)

    def to_representation(self, instance):
        return ChannelConnectionSerializer(instance).data
