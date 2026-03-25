from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, models
from django.db.models import UniqueConstraint


class Booking(models.Model):
    SOURCE_CHOICES = [
        ('direct', 'Direct'),
        ('booking_com', 'Booking.com'),
        ('airbnb', 'Airbnb'),
        ('phone', 'Phone'),
        ('walkin', 'Walk-in'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('checked_in', 'Checked In'),
        ('checked_out', 'Checked Out'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bog_ipay', 'BOG iPay'),
        ('tbc_pay', 'TBC Pay'),
        ('bank_transfer', 'Bank Transfer'),
        ('channel', 'Channel'),
    ]

    property = models.ForeignKey(
        'properties.Property', on_delete=models.CASCADE, related_name='bookings'
    )
    room = models.ForeignKey(
        'properties.Room', on_delete=models.CASCADE, related_name='bookings'
    )
    guest = models.ForeignKey(
        'guests.Guest', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings'
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='direct')
    external_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    check_in = models.DateField()
    check_out = models.DateField()
    num_guests = models.PositiveIntegerField(default=1)
    num_nights = models.PositiveIntegerField(editable=False, default=0)
    total_price_gel = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount_gel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid'
    )
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True
    )
    guest_name = models.CharField(max_length=200)
    guest_phone = models.CharField(max_length=20, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_country = models.CharField(max_length=2, blank=True)
    notes = models.TextField(blank=True)
    guest_message = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.guest_name} — {self.room} ({self.check_in} → {self.check_out})'

    def save(self, *args, **kwargs):
        # Validate dates
        if self.check_out <= self.check_in:
            raise ValidationError('გასვლის თარიღი უნდა იყოს ჩასახლების შემდეგ.')

        self.num_nights = (self.check_out - self.check_in).days

        is_new = self._state.adding
        old_check_in = None
        old_check_out = None

        if not is_new:
            try:
                old = Booking.objects.get(pk=self.pk)
                old_check_in = old.check_in
                old_check_out = old.check_out
            except Booking.DoesNotExist:
                is_new = True

        super().save(*args, **kwargs)

        dates_changed = is_new or (old_check_in != self.check_in) or (old_check_out != self.check_out)

        if dates_changed and self.status != 'cancelled':
            if not is_new:
                self.room_nights.all().delete()

            dates = [
                self.check_in + timedelta(days=i) for i in range(self.num_nights)
            ]
            room_nights = [
                RoomNight(room=self.room, date=d, booking=self) for d in dates
            ]
            try:
                RoomNight.objects.bulk_create(room_nights)
            except IntegrityError:
                raise ValidationError('ოთახი ამ თარიღებში დაკავებულია.')

    def cancel(self, reason=''):
        self.status = 'cancelled'
        self.cancellation_reason = reason
        self.room_nights.all().delete()
        self.save(update_fields=['status', 'cancellation_reason', 'updated_at'])

    @classmethod
    def check_availability(cls, room_id, check_in, check_out):
        occupied = RoomNight.objects.filter(
            room_id=room_id, date__gte=check_in, date__lt=check_out
        )
        if occupied.exists():
            occupied_dates = list(occupied.values_list('date', flat=True))
            return False, occupied_dates
        return True, []


class RoomNight(models.Model):
    room = models.ForeignKey(
        'properties.Room', on_delete=models.CASCADE, related_name='room_nights'
    )
    date = models.DateField()
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='room_nights')

    class Meta:
        unique_together = ['room', 'date']
        constraints = [
            UniqueConstraint(fields=['room', 'date'], name='unique_room_night'),
        ]

    def __str__(self):
        return f'{self.room} — {self.date}'
