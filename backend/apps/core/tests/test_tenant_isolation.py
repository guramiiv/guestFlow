"""
Tenant isolation tests.
These tests create TWO users with TWO properties and verify
that User A can NEVER access User B's data.
Run these on every deploy: python manage.py test apps.core.tests.test_tenant_isolation -v2
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.models import Booking
from apps.guests.models import Guest
from apps.properties.models import Property, Room

User = get_user_model()


class TenantIsolationTestCase(APITestCase):
    """
    Core multi-tenant security tests.
    Every test authenticates as User A and attempts to access User B's data.
    Expected: 404 on every cross-tenant access (not 403 — never reveal existence).
    """

    def setUp(self):
        # ── User A ──
        self.user_a = User.objects.create_user(
            email='a@test.com', password='TestPass123!'
        )
        self.property_a = Property.objects.create(
            owner=self.user_a,
            name_ka='სასტუმრო A',
            name_en='Property A',
            region='tbilisi',
        )
        self.room_a = Room.objects.create(
            property=self.property_a,
            name_ka='ოთახი A',
            name_en='Room A',
            base_price_gel=Decimal('100.00'),
        )
        self.guest_a = Guest.objects.create(
            property=self.property_a,
            first_name='Guest',
            last_name='A',
            email='guest_a@test.com',
            phone='+995111111111',
        )
        self.booking_a = Booking.objects.create(
            property=self.property_a,
            room=self.room_a,
            guest=self.guest_a,
            guest_name='Guest A',
            guest_email='guest_a@test.com',
            check_in=date.today() + timedelta(days=10),
            check_out=date.today() + timedelta(days=12),
            total_price_gel=Decimal('200.00'),
            status='confirmed',
        )

        # ── User B ──
        self.user_b = User.objects.create_user(
            email='b@test.com', password='TestPass123!'
        )
        self.property_b = Property.objects.create(
            owner=self.user_b,
            name_ka='სასტუმრო B',
            name_en='Property B',
            region='kakheti',
        )
        self.room_b = Room.objects.create(
            property=self.property_b,
            name_ka='ოთახი B',
            name_en='Room B',
            base_price_gel=Decimal('150.00'),
        )
        self.guest_b = Guest.objects.create(
            property=self.property_b,
            first_name='Guest',
            last_name='B',
            email='guest_b@test.com',
            phone='+995222222222',
        )
        self.booking_b = Booking.objects.create(
            property=self.property_b,
            room=self.room_b,
            guest=self.guest_b,
            guest_name='Guest B',
            guest_email='guest_b@test.com',
            check_in=date.today() + timedelta(days=20),
            check_out=date.today() + timedelta(days=22),
            total_price_gel=Decimal('300.00'),
            status='confirmed',
        )

    # ──────────────────────────────────────────────
    # Rooms — list / retrieve / update / delete
    # ──────────────────────────────────────────────

    def test_user_a_list_rooms_only_sees_own(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/property/rooms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        room_ids = [r['id'] for r in response.data['results']]
        self.assertIn(self.room_a.id, room_ids)
        self.assertNotIn(self.room_b.id, room_ids)

    def test_user_a_cannot_get_user_b_room(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f'/api/property/rooms/{self.room_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_update_user_b_room(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(
            f'/api/property/rooms/{self.room_b.id}/',
            {'name_ka': 'Hacked'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.room_b.refresh_from_db()
        self.assertEqual(self.room_b.name_ka, 'ოთახი B')

    def test_user_a_cannot_delete_user_b_room(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f'/api/property/rooms/{self.room_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Room.objects.filter(id=self.room_b.id).exists())

    # ──────────────────────────────────────────────
    # Bookings — list / retrieve / update / delete / actions
    # ──────────────────────────────────────────────

    def test_user_a_list_bookings_only_sees_own(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/bookings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking_ids = [b['id'] for b in response.data['results']]
        self.assertIn(self.booking_a.id, booking_ids)
        self.assertNotIn(self.booking_b.id, booking_ids)

    def test_user_a_cannot_get_user_b_booking(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f'/api/bookings/{self.booking_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_update_user_b_booking(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(
            f'/api/bookings/{self.booking_b.id}/',
            {'guest_name': 'Hacked'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.booking_b.refresh_from_db()
        self.assertEqual(self.booking_b.guest_name, 'Guest B')

    def test_user_a_cannot_delete_user_b_booking(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f'/api/bookings/{self.booking_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Booking.objects.filter(id=self.booking_b.id).exists())

    def test_user_a_cannot_check_in_user_b_booking(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(f'/api/bookings/{self.booking_b.id}/check_in/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.booking_b.refresh_from_db()
        self.assertEqual(self.booking_b.status, 'confirmed')

    def test_user_a_cannot_check_out_user_b_booking(self):
        self.booking_b.status = 'checked_in'
        self.booking_b.save(update_fields=['status'])
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(f'/api/bookings/{self.booking_b.id}/check_out/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.booking_b.refresh_from_db()
        self.assertEqual(self.booking_b.status, 'checked_in')

    def test_user_a_cannot_cancel_user_b_booking(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            f'/api/bookings/{self.booking_b.id}/cancel/',
            {'cancellation_reason': 'Hacked'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.booking_b.refresh_from_db()
        self.assertEqual(self.booking_b.status, 'confirmed')

    def test_user_a_cannot_record_payment_on_user_b_booking(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            f'/api/bookings/{self.booking_b.id}/record_payment/',
            {'amount': '50.00', 'payment_method': 'cash'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.booking_b.refresh_from_db()
        self.assertEqual(self.booking_b.paid_amount_gel, Decimal('0'))

    def test_user_a_cannot_create_booking_in_user_b_room(self):
        """Booking creation with a room from another tenant must be rejected."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            '/api/bookings/',
            {
                'room': self.room_b.id,
                'check_in': (date.today() + timedelta(days=30)).isoformat(),
                'check_out': (date.today() + timedelta(days=32)).isoformat(),
                'guest_name': 'Hacker',
                'guest_email': 'hack@test.com',
                'total_price_gel': '200.00',
                'num_guests': 1,
            },
            format='json',
        )
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])
        # Verify no booking was created for user B's room by user A
        self.assertFalse(
            Booking.objects.filter(
                room=self.room_b, guest_name='Hacker'
            ).exists()
        )

    def test_user_a_calendar_only_sees_own(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/bookings/calendar/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking_ids = [b['id'] for b in response.data]
        self.assertNotIn(self.booking_b.id, booking_ids)

    # ──────────────────────────────────────────────
    # Guests — list / retrieve / update / delete
    # ──────────────────────────────────────────────

    def test_user_a_list_guests_only_sees_own(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/guests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        guest_ids = [g['id'] for g in response.data['results']]
        self.assertIn(self.guest_a.id, guest_ids)
        self.assertNotIn(self.guest_b.id, guest_ids)

    def test_user_a_cannot_get_user_b_guest(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f'/api/guests/{self.guest_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_update_user_b_guest(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(
            f'/api/guests/{self.guest_b.id}/',
            {'first_name': 'Hacked'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.guest_b.refresh_from_db()
        self.assertEqual(self.guest_b.first_name, 'Guest')

    def test_user_a_cannot_delete_user_b_guest(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f'/api/guests/{self.guest_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Guest.objects.filter(id=self.guest_b.id).exists())

    # ──────────────────────────────────────────────
    # Dashboard / Reports — data isolation
    # ──────────────────────────────────────────────

    def test_dashboard_only_shows_own_data(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Recent bookings should only contain user A's data
        recent_ids = [b['id'] for b in response.data.get('recent_bookings', [])]
        self.assertNotIn(self.booking_b.id, recent_ids)
        # Upcoming arrivals should only contain user A's data
        upcoming_ids = [a['id'] for a in response.data.get('upcoming_arrivals', [])]
        self.assertNotIn(self.booking_b.id, upcoming_ids)

    def test_revenue_report_only_shows_own_data(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/reports/revenue/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_occupancy_report_only_shows_own_data(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/reports/occupancy/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ──────────────────────────────────────────────
    # Reverse direction — User B cannot access User A
    # ──────────────────────────────────────────────

    def test_user_b_cannot_get_user_a_room(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(f'/api/property/rooms/{self.room_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_b_cannot_get_user_a_booking(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(f'/api/bookings/{self.booking_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_b_cannot_get_user_a_guest(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(f'/api/guests/{self.guest_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ──────────────────────────────────────────────
    # Unauthenticated access — must be denied
    # ──────────────────────────────────────────────

    def test_unauthenticated_cannot_list_rooms(self):
        response = self.client.get('/api/property/rooms/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_list_bookings(self):
        response = self.client.get('/api/bookings/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_list_guests(self):
        response = self.client.get('/api/guests/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
