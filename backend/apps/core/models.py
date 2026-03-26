from django.conf import settings
from django.db import models


class SensitiveDataAccessLog(models.Model):
    """
    Audit trail for access to sensitive guest PII (passport/ID numbers, exports).
    Logged whenever a property owner views or exports sensitive fields.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sensitive_data_logs',
    )
    action = models.CharField(max_length=50)  # e.g. 'view_id_number', 'export_guests'
    target_model = models.CharField(max_length=50)  # e.g. 'Guest'
    target_id = models.PositiveBigIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['target_model', 'target_id']),
        ]

    def __str__(self):
        return f'{self.user} — {self.action} on {self.target_model}#{self.target_id} at {self.timestamp}'

    @classmethod
    def log(cls, request, action, target_model, target_id=None):
        """Convenience method to create an audit log entry from a request."""
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
        return cls.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action=action,
            target_model=target_model,
            target_id=target_id,
            ip_address=ip,
        )
