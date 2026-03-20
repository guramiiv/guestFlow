from django.contrib import admin

from .models import Booking, RoomNight


class RoomNightInline(admin.TabularInline):
    model = RoomNight
    extra = 0
    readonly_fields = ('room', 'date')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'guest_name', 'room', 'check_in', 'check_out', 'status',
        'source', 'total_price_gel', 'payment_status',
    )
    list_filter = ('status', 'source', 'payment_status', 'property')
    search_fields = ('guest_name', 'guest_email', 'guest_phone', 'external_id')
    date_hierarchy = 'check_in'
    inlines = [RoomNightInline]


@admin.register(RoomNight)
class RoomNightAdmin(admin.ModelAdmin):
    list_display = ('room', 'date', 'booking')
    list_filter = ('room__property', 'date')
