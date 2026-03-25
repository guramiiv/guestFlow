from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Property(models.Model):
    REGION_CHOICES = [
        ('tbilisi', 'Tbilisi'),
        ('kakheti', 'Kakheti'),
        ('imereti', 'Imereti'),
        ('adjara', 'Adjara'),
        ('svaneti', 'Svaneti'),
        ('mtskheta_mtianeti', 'Mtskheta-Mtianeti'),
        ('guria', 'Guria'),
        ('samegrelo', 'Samegrelo'),
        ('racha', 'Racha'),
        ('kvemo_kartli', 'Kvemo Kartli'),
        ('shida_kartli', 'Shida Kartli'),
        ('samtskhe_javakheti', 'Samtskhe-Javakheti'),
    ]

    PROPERTY_TYPE_CHOICES = [
        ('guesthouse', 'Guesthouse'),
        ('hotel', 'Hotel'),
        ('apartment', 'Apartment'),
        ('villa', 'Villa'),
    ]

    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('pro', 'Pro'),
        ('business', 'Business'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties'
    )
    name_ka = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True, allow_unicode=True)
    property_type = models.CharField(
        max_length=20, choices=PROPERTY_TYPE_CHOICES, default='guesthouse'
    )
    description_ka = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    address_ka = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=50, choices=REGION_CHOICES, default='tbilisi')
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    check_in_time = models.TimeField(default='14:00')
    check_out_time = models.TimeField(default='12:00')
    house_rules_ka = models.TextField(blank=True)
    house_rules_en = models.TextField(blank=True)
    tax_id = models.CharField(max_length=20, blank=True)
    amenities = models.JSONField(default=list)
    photos = models.JSONField(default=list)
    banner_photo = models.URLField(max_length=500, blank=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'properties'

    def __str__(self):
        return self.name_ka

    def _generate_unique_slug(self):
        base = self.name_en or self.name_ka
        slug = slugify(base, allow_unicode=True)
        unique_slug = slug
        counter = 1
        while Property.objects.filter(slug=unique_slug).exclude(pk=self.pk).exists():
            unique_slug = f'{slug}-{counter}'
            counter += 1
        return unique_slug

    def save(self, *args, **kwargs):
        if self.pk:
            # Re-generate slug when name changes
            try:
                old = Property.objects.only('name_ka', 'name_en').get(pk=self.pk)
                if old.name_ka != self.name_ka or old.name_en != self.name_en:
                    self.slug = self._generate_unique_slug()
            except Property.DoesNotExist:
                pass
        if not self.slug:
            self.slug = self._generate_unique_slug()
        super().save(*args, **kwargs)


class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('single', 'Single'),
        ('double', 'Double'),
        ('twin', 'Twin'),
        ('family', 'Family'),
        ('suite', 'Suite'),
        ('dorm', 'Dorm'),
    ]

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='rooms')
    name_ka = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100, blank=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='double')
    max_guests = models.PositiveIntegerField(default=2)
    base_price_gel = models.DecimalField(max_digits=10, decimal_places=2)
    description_ka = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    amenities = models.JSONField(default=list)
    photos = models.JSONField(default=list)
    floor = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name_ka']

    def __str__(self):
        return f'{self.name_ka} ({self.property.name_ka})'


class SeasonalRate(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='seasonal_rates')
    name_ka = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    price_gel = models.DecimalField(max_digits=10, decimal_places=2)
    min_stay = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f'{self.name_ka}: {self.start_date} – {self.end_date}'


class ShareEvent(models.Model):
    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('whatsapp', 'WhatsApp'),
        ('viber', 'Viber'),
        ('telegram', 'Telegram'),
        ('sms', 'SMS'),
        ('email', 'Email'),
        ('copy_link', 'Copy Link'),
        ('qr_download', 'QR Download'),
        ('qr_print', 'QR Print'),
        ('native_share', 'Native Share'),
    ]

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='share_events')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.property.name_ka} — {self.platform} ({self.created_at:%Y-%m-%d})'
