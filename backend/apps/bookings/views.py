import logging
import io
from datetime import date, timedelta
from decimal import Decimal

import qrcode
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.mixins import TenantQuerySetMixin
from apps.core.throttles import BookingCreateThrottle, PaymentThrottle
from apps.properties.models import Property, Room, SeasonalRate

from .models import Booking, RoomNight
from .serializers import (
    BookingCalendarSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    PublicAvailabilitySerializer,
    PublicBookingConfirmationSerializer,
    PublicBookingCreateSerializer,
    PublicPropertySerializer,
    PublicRoomSerializer,
    RecordPaymentSerializer,
)

logger = logging.getLogger(__name__)


class BookingViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    CRUD for bookings. Every queryset is filtered by property__owner=request.user
    for multi-tenant security.
    """
    queryset = Booking.objects.select_related('room', 'guest', 'property')

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        if self.action == 'calendar':
            return BookingCalendarSerializer
        return BookingSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filtering
        params = self.request.query_params
        if status_filter := params.get('status'):
            qs = qs.filter(status=status_filter)
        if source_filter := params.get('source'):
            qs = qs.filter(source=source_filter)
        if start_date := params.get('start_date'):
            qs = qs.filter(check_in__gte=start_date)
        if end_date := params.get('end_date'):
            qs = qs.filter(check_out__lte=end_date)

        return qs

    def perform_create(self, serializer):
        prop = self.request.user.properties.first()
        if not prop:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No property associated with this account.")
        guest_name = serializer.validated_data.get('guest_name', '')
        guest_phone = serializer.validated_data.get('guest_phone', '')
        guest_email = serializer.validated_data.get('guest_email', '')

        # Auto-create guest if not linked and we have a name
        guest = serializer.validated_data.get('guest')
        if not guest and guest_name and prop:
            from apps.guests.models import Guest
            parts = guest_name.strip().split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''
            guest, _ = Guest.objects.get_or_create(
                property=prop,
                first_name=first_name,
                last_name=last_name,
                defaults={
                    'phone': guest_phone,
                    'email': guest_email,
                    'country': serializer.validated_data.get('guest_country', ''),
                },
            )

        serializer.save(property=prop, guest=guest)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        booking = self.get_object()
        if booking.status not in ('confirmed', 'pending'):
            return Response(
                {'detail': 'ჯავშანი არ არის დადასტურებული.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = 'checked_in'
        booking.save(update_fields=['status', 'updated_at'])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        booking = self.get_object()
        if booking.status != 'checked_in':
            return Response(
                {'detail': 'სტუმარი არ არის ჩასახლებული.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = 'checked_out'
        booking.save(update_fields=['status', 'updated_at'])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in ('checked_out', 'cancelled'):
            return Response(
                {'detail': 'ჯავშანი ვერ გაუქმდება.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get('cancellation_reason', '')
        booking.cancel(reason=reason)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'], throttle_classes=[PaymentThrottle])
    def record_payment(self, request, pk=None):
        booking = self.get_object()
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        method = serializer.validated_data.get('payment_method')

        booking.paid_amount_gel += Decimal(str(amount))
        if method:
            booking.payment_method = method

        if booking.paid_amount_gel >= booking.total_price_gel:
            booking.payment_status = 'paid'
        elif booking.paid_amount_gel > 0:
            booking.payment_status = 'partial'

        booking.save(update_fields=[
            'paid_amount_gel', 'payment_status', 'payment_method', 'updated_at'
        ])
        return Response(BookingSerializer(booking).data)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        qs = self.get_queryset().exclude(status='cancelled')
        params = request.query_params
        if start := params.get('start_date'):
            qs = qs.filter(check_out__gt=start)
        if end := params.get('end_date'):
            qs = qs.filter(check_in__lt=end)
        serializer = BookingCalendarSerializer(qs, many=True)
        return Response(serializer.data)


# ──────────────────────────────────────────────
# Public (unauthenticated) views
# ──────────────────────────────────────────────

def _get_property_or_404(slug):
    try:
        return Property.objects.get(slug=slug, is_active=True)
    except Property.DoesNotExist:
        return None


class PublicPropertyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        prop = _get_property_or_404(slug)
        if not prop:
            return Response({'detail': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = PublicPropertySerializer(prop).data
        rooms = Room.objects.filter(property=prop, is_active=True)
        data['rooms'] = PublicRoomSerializer(rooms, many=True, context={'request': request}).data
        return Response(data)


class PublicAvailabilityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        prop = _get_property_or_404(slug)
        if not prop:
            return Response({'detail': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)

        check_in_str = request.query_params.get('check_in')
        check_out_str = request.query_params.get('check_out')
        guests = int(request.query_params.get('guests', 1))

        if not check_in_str or not check_out_str:
            return Response(
                {'detail': 'check_in and check_out query params are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            check_in = date.fromisoformat(check_in_str)
            check_out = date.fromisoformat(check_out_str)
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = date.today()
        if check_in < today:
            return Response({'detail': 'check_in must be today or later.'}, status=status.HTTP_400_BAD_REQUEST)
        if check_out <= check_in:
            return Response({'detail': 'check_out must be after check_in.'}, status=status.HTTP_400_BAD_REQUEST)
        if (check_out - check_in).days > 30:
            return Response({'detail': 'Maximum stay is 30 nights.'}, status=status.HTTP_400_BAD_REQUEST)

        num_nights = (check_out - check_in).days

        # All active rooms for this property with enough capacity
        rooms = Room.objects.filter(property=prop, is_active=True, max_guests__gte=guests)

        # Find rooms that have NO RoomNight entries in the requested range
        occupied_room_ids = RoomNight.objects.filter(
            room__property=prop,
            date__gte=check_in,
            date__lt=check_out,
        ).values_list('room_id', flat=True).distinct()

        available_rooms = rooms.exclude(id__in=occupied_room_ids)

        results = []
        for room in available_rooms:
            # Calculate total price using per-night effective rate
            total = Decimal('0')
            for i in range(num_nights):
                night_date = check_in + timedelta(days=i)
                seasonal = SeasonalRate.objects.filter(
                    room=room, start_date__lte=night_date, end_date__gte=night_date,
                ).first()
                total += seasonal.price_gel if seasonal else room.base_price_gel

            price_per_night = total / num_nights

            results.append({
                'room': room,
                'price_per_night_gel': price_per_night,
                'total_price_gel': total,
                'nights': num_nights,
            })

        # Sort by total price ascending
        results.sort(key=lambda r: r['total_price_gel'])

        serializer = PublicAvailabilitySerializer(results, many=True, context={'request': request})
        return Response(serializer.data)


class PublicCreateBookingView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [BookingCreateThrottle]

    def post(self, request, slug):
        serializer = PublicBookingCreateSerializer(
            data=request.data,
            context={'slug': slug, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        # Send async notification
        from .tasks import send_booking_notification
        send_booking_notification.delay(booking.id)

        if booking.status == 'pending':
            # BOG iPay — return placeholder payment URL
            confirmation = PublicBookingConfirmationSerializer(booking).data
            confirmation['payment_redirect_url'] = f'/api/public/{slug}/pay/{booking.id}/'
            return Response(confirmation, status=status.HTTP_201_CREATED)

        # pay_at_property — confirmed
        logger.info('Booking %s confirmed (pay at property) for %s', booking.id, booking.guest_email)
        return Response(
            PublicBookingConfirmationSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class PublicBookingStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug, booking_id):
        prop = _get_property_or_404(slug)
        if not prop:
            return Response({'detail': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)

        email = request.query_params.get('email', '')
        if not email:
            return Response(
                {'detail': 'email query param is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking = Booking.objects.select_related('property', 'room').get(
                id=booking_id, property=prop, guest_email=email,
            )
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(PublicBookingConfirmationSerializer(booking).data)


class PublicQRCodeView(APIView):
    """Public QR code PNG for a property's booking URL — no auth needed."""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        prop = _get_property_or_404(slug)
        if not prop:
            return Response({'detail': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)

        booking_url = f"https://guestflow.ge/book/{prop.slug}"

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(booking_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        img = img.resize((400, 400))

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        response = HttpResponse(buf.getvalue(), content_type='image/png')
        response['Cache-Control'] = 'public, max-age=86400'
        return response
