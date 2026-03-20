from django.contrib import admin

from .models import Guest


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = (
        'first_name', 'last_name', 'email', 'phone',
        'country', 'total_stays', 'total_spent_gel', 'property',
    )
    list_filter = ('country', 'language', 'property')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    readonly_fields = ('created_at', 'updated_at')
