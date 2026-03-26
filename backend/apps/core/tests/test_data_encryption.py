"""
Tests for sensitive data encryption, masking, and audit logging.
Verifies:
  - Guest id_number is encrypted at rest and masked in list responses
  - Guest id_number is visible (full) in detail responses
  - Detail view of guest with id_number creates an audit log entry
  - Channel credentials are never returned in any API response
  - Channel credentials can be written via the create serializer
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import SensitiveDataAccessLog
from apps.guests.models import Guest
from apps.properties.models import ChannelConnection, Property, Room

User = get_user_model()


class GuestIdNumberEncryptionTest(TestCase):
    """Verify that id_number is encrypted at the DB level."""

    def setUp(self):
        self.user = User.objects.create_user(email='enc@test.com', password='TestPass123!')
        self.prop = Property.objects.create(
            owner=self.user, name_ka='ტესტი', region='tbilisi',
        )

    def test_id_number_round_trip(self):
        """Value survives save/reload via the encrypted field."""
        guest = Guest.objects.create(
            property=self.prop,
            first_name='Test',
            last_name='Guest',
            id_number='AB1234567',
        )
        guest.refresh_from_db()
        self.assertEqual(guest.id_number, 'AB1234567')

    def test_id_number_masked_property(self):
        guest = Guest(
            property=self.prop,
            first_name='Test',
            last_name='Guest',
            id_number='AB1234567',
        )
        self.assertEqual(guest.id_number_masked, '*****4567')

    def test_id_number_masked_short_value(self):
        guest = Guest(
            property=self.prop,
            first_name='Test',
            last_name='Guest',
            id_number='1234',
        )
        self.assertEqual(guest.id_number_masked, '1234')

    def test_id_number_masked_empty(self):
        guest = Guest(
            property=self.prop,
            first_name='Test',
            last_name='Guest',
            id_number='',
        )
        self.assertEqual(guest.id_number_masked, '')


class GuestSerializerMaskingTest(APITestCase):
    """Verify masking in list vs. full display in detail."""

    def setUp(self):
        self.user = User.objects.create_user(email='mask@test.com', password='TestPass123!')
        self.prop = Property.objects.create(
            owner=self.user, name_ka='ტესტი', region='tbilisi',
        )
        self.guest = Guest.objects.create(
            property=self.prop,
            first_name='Test',
            last_name='Guest',
            id_type='passport',
            id_number='GE9876543',
        )
        self.client.force_authenticate(user=self.user)

    def test_list_view_masks_id_number(self):
        response = self.client.get('/api/guests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        guest_data = response.data['results'][0]
        self.assertEqual(guest_data['id_number'], '*****6543')
        self.assertNotEqual(guest_data['id_number'], 'GE9876543')

    def test_detail_view_shows_full_id_number(self):
        response = self.client.get(f'/api/guests/{self.guest.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id_number'], 'GE9876543')

    def test_create_accepts_full_id_number(self):
        response = self.client.post('/api/guests/', {
            'first_name': 'New',
            'last_name': 'Person',
            'id_type': 'national_id',
            'id_number': 'XX1111222',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_guest = Guest.objects.get(first_name='New')
        self.assertEqual(new_guest.id_number, 'XX1111222')

    def test_update_accepts_full_id_number(self):
        response = self.client.patch(f'/api/guests/{self.guest.id}/', {
            'id_number': 'UPDATED999',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.guest.refresh_from_db()
        self.assertEqual(self.guest.id_number, 'UPDATED999')


class SensitiveDataAuditLogTest(APITestCase):
    """Verify audit logging when accessing sensitive guest data."""

    def setUp(self):
        self.user = User.objects.create_user(email='audit@test.com', password='TestPass123!')
        self.prop = Property.objects.create(
            owner=self.user, name_ka='ტესტი', region='tbilisi',
        )
        self.guest_with_id = Guest.objects.create(
            property=self.prop,
            first_name='Has',
            last_name='Passport',
            id_number='PP123456',
        )
        self.guest_no_id = Guest.objects.create(
            property=self.prop,
            first_name='No',
            last_name='Id',
            id_number='',
        )
        self.client.force_authenticate(user=self.user)

    def test_detail_view_creates_audit_log_when_id_exists(self):
        self.client.get(f'/api/guests/{self.guest_with_id.id}/')
        log = SensitiveDataAccessLog.objects.filter(
            action='view_id_number',
            target_model='Guest',
            target_id=self.guest_with_id.id,
        )
        self.assertEqual(log.count(), 1)
        self.assertEqual(log.first().user, self.user)

    def test_detail_view_no_audit_log_when_no_id(self):
        self.client.get(f'/api/guests/{self.guest_no_id.id}/')
        log = SensitiveDataAccessLog.objects.filter(
            action='view_id_number',
            target_model='Guest',
            target_id=self.guest_no_id.id,
        )
        self.assertEqual(log.count(), 0)

    def test_list_view_does_not_create_audit_log(self):
        self.client.get('/api/guests/')
        self.assertEqual(SensitiveDataAccessLog.objects.count(), 0)


class ChannelConnectionSecurityTest(APITestCase):
    """Verify channel credentials are encrypted and never leaked in responses."""

    def setUp(self):
        self.user = User.objects.create_user(email='chan@test.com', password='TestPass123!')
        self.prop = Property.objects.create(
            owner=self.user, name_ka='ტესტი', region='tbilisi',
        )
        self.client.force_authenticate(user=self.user)

    def test_create_channel_connection(self):
        response = self.client.post('/api/property/channels/', {
            'channel': 'booking_com',
            'property_external_id': 'ext-123',
            'api_key': 'super-secret-key',
            'api_secret': 'super-secret-secret',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Response must NOT contain credentials
        self.assertNotIn('api_key', response.data)
        self.assertNotIn('api_secret', response.data)
        # But values are saved (encrypted) in DB
        conn = ChannelConnection.objects.first()
        self.assertEqual(conn.api_key, 'super-secret-key')
        self.assertEqual(conn.api_secret, 'super-secret-secret')

    def test_list_does_not_expose_credentials(self):
        ChannelConnection.objects.create(
            property=self.prop,
            channel='airbnb',
            property_external_id='air-456',
            api_key='secret-key',
            api_secret='secret-secret',
        )
        response = self.client.get('/api/property/channels/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        conn_data = response.data['results'][0]
        self.assertNotIn('api_key', conn_data)
        self.assertNotIn('api_secret', conn_data)
        self.assertEqual(conn_data['channel'], 'airbnb')

    def test_detail_does_not_expose_credentials(self):
        conn = ChannelConnection.objects.create(
            property=self.prop,
            channel='expedia',
            api_key='key',
            api_secret='secret',
        )
        response = self.client.get(f'/api/property/channels/{conn.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('api_key', response.data)
        self.assertNotIn('api_secret', response.data)

    def test_credentials_round_trip_encrypted(self):
        """Values survive save/reload through encryption."""
        conn = ChannelConnection.objects.create(
            property=self.prop,
            channel='booking_com',
            api_key='my-key-123',
            api_secret='my-secret-456',
        )
        conn.refresh_from_db()
        self.assertEqual(conn.api_key, 'my-key-123')
        self.assertEqual(conn.api_secret, 'my-secret-456')

    def test_cross_tenant_channel_isolation(self):
        """User B cannot see User A's channel connections."""
        ChannelConnection.objects.create(
            property=self.prop,
            channel='booking_com',
            api_key='key-a',
        )
        user_b = User.objects.create_user(email='b-chan@test.com', password='TestPass123!')
        prop_b = Property.objects.create(
            owner=user_b, name_ka='B', region='kakheti',
        )
        self.client.force_authenticate(user=user_b)
        response = self.client.get('/api/property/channels/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
