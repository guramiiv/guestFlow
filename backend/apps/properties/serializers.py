from rest_framework import serializers

from .models import Property, Room, SeasonalRate


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
            'tax_id', 'amenities', 'photos', 'plan', 'is_active',
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
            'tax_id', 'amenities', 'photos',
        )
