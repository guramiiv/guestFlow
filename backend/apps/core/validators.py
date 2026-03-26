import re

import bleach
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


def validate_phone(value):
    """Validate phone number format: optional + prefix, 9-15 digits."""
    if value and not re.match(r'^\+?[0-9]{9,15}$', value):
        raise serializers.ValidationError('Invalid phone number format.')
    return value


def normalize_email(value):
    """Lowercase and strip email addresses."""
    if value:
        return value.lower().strip()
    return value


def sanitize_text(value):
    """Strip all HTML tags from text input to prevent stored XSS."""
    if value:
        return bleach.clean(value, tags=[], strip=True)
    return value


def validate_image_upload(file):
    """
    Validate uploaded image files:
    - Max 5MB
    - Only JPEG, PNG, WebP content types
    - Verify the file is actually a valid image (not renamed malware)
    """
    max_size = 5 * 1024 * 1024  # 5MB
    if file.size > max_size:
        raise DjangoValidationError('Image must be under 5MB.')

    allowed_types = ('image/jpeg', 'image/png', 'image/webp')
    if file.content_type not in allowed_types:
        raise DjangoValidationError('Only JPEG, PNG, and WebP images are allowed.')

    # Verify it's actually a valid image
    try:
        from PIL import Image
        img = Image.open(file)
        img.verify()
        file.seek(0)  # Reset after verify() consumes the file
    except Exception:
        raise DjangoValidationError('Invalid image file.')

    return file
