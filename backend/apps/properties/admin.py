from django.contrib import admin

from .models import Property, Room, SeasonalRate, ShareEvent


class RoomInline(admin.TabularInline):
    model = Room
    extra = 0


class SeasonalRateInline(admin.TabularInline):
    model = SeasonalRate
    extra = 0


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name_ka', 'owner', 'property_type', 'city', 'region', 'plan', 'is_active')
    list_filter = ('property_type', 'region', 'plan', 'is_active')
    search_fields = ('name_ka', 'name_en', 'city')
    prepopulated_fields = {'slug': ('name_en',)}
    inlines = [RoomInline]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name_ka', 'property', 'room_type', 'base_price_gel', 'max_guests', 'floor', 'is_active')
    list_filter = ('room_type', 'is_active', 'property')
    search_fields = ('name_ka', 'name_en')
    inlines = [SeasonalRateInline]


@admin.register(ShareEvent)
class ShareEventAdmin(admin.ModelAdmin):
    list_display = ('property', 'platform', 'created_at')
    list_filter = ('platform', 'created_at')
    readonly_fields = ('property', 'platform', 'created_at')


@admin.register(SeasonalRate)
class SeasonalRateAdmin(admin.ModelAdmin):
    list_display = ('name_ka', 'room', 'start_date', 'end_date', 'price_gel', 'min_stay')
    list_filter = ('room__property',)
