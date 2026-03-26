from django.db import models
from encrypted_model_fields.fields import EncryptedCharField

# Save builtin before the field name 'property' shadows it
_property = property


class Guest(models.Model):
    ID_TYPE_CHOICES = [
        ('passport', 'Passport'),
        ('national_id', 'National ID'),
        ('driving_license', 'Driving License'),
    ]

    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='guests',
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, blank=True)
    language = models.CharField(max_length=2, default='en')
    id_type = models.CharField(
        max_length=20, choices=ID_TYPE_CHOICES, blank=True,
    )
    id_number = EncryptedCharField(max_length=50, blank=True, default='')
    total_stays = models.PositiveIntegerField(default=0)
    total_spent_gel = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.full_name

    @_property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @_property
    def id_number_masked(self):
        """Return masked ID number for list views: '****1234' or empty string."""
        val = self.id_number or ''
        if len(val) <= 4:
            return val
        return '*' * (len(val) - 4) + val[-4:]
