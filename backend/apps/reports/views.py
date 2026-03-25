from datetime import timedelta

from django.db.models import Count, F, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking, RoomNight
from apps.properties.models import Room, ShareEvent


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prop = request.user.properties.first()
        today = timezone.localdate()
        month_start = today.replace(day=1)

        today_check_ins = Booking.objects.filter(
            property=prop,
            check_in=today,
            status__in=['confirmed', 'checked_in'],
        ).count()

        today_check_outs = Booking.objects.filter(
            property=prop,
            check_out=today,
            status='checked_in',
        ).count()

        total_active_rooms = Room.objects.filter(
            property=prop, is_active=True,
        ).count()
        rooms_occupied = RoomNight.objects.filter(
            booking__property=prop,
            date=today,
        ).values('room').distinct().count()
        current_occupancy = (
            round(rooms_occupied / total_active_rooms * 100, 1)
            if total_active_rooms > 0
            else 0
        )

        month_revenue = Booking.objects.filter(
            property=prop,
            check_in__gte=month_start,
            check_in__lte=today,
        ).exclude(status='cancelled').aggregate(
            total=Sum('total_price_gel'),
        )['total'] or 0

        upcoming_arrivals = list(
            Booking.objects.filter(
                property=prop,
                check_in__gte=today,
                check_in__lte=today + timedelta(days=7),
                status__in=['confirmed', 'pending'],
            )
            .select_related('room')
            .order_by('check_in')[:10]
            .values('id', 'guest_name', 'check_in', 'status', room_name=F('room__name_ka'))
        )

        recent_bookings = list(
            Booking.objects.filter(property=prop)
            .select_related('room')
            .order_by('-created_at')[:10]
            .values(
                'id', 'guest_name', 'check_in', 'check_out',
                'status', 'source', 'total_price_gel',
                room_name=F('room__name_ka'),
            )
        )

        # Share tracking stats
        share_qs = ShareEvent.objects.filter(
            property=prop,
            created_at__date__gte=month_start,
            created_at__date__lte=today,
        )
        share_count_this_month = share_qs.count()
        share_breakdown = dict(
            share_qs.values_list('platform')
            .annotate(count=Count('id'))
            .values_list('platform', 'count')
        )

        return Response({
            'today_check_ins': today_check_ins,
            'today_check_outs': today_check_outs,
            'current_occupancy': current_occupancy,
            'month_revenue': month_revenue,
            'upcoming_arrivals': upcoming_arrivals,
            'recent_bookings': recent_bookings,
            'share_count_this_month': share_count_this_month,
            'share_breakdown': share_breakdown,
        })


class RevenueReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models.functions import TruncDay, TruncWeek, TruncMonth

        prop = request.user.properties.first()
        period = request.query_params.get('period', 'daily')
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        today = timezone.localdate()
        if start:
            from datetime import date as date_type
            start_date = date_type.fromisoformat(start)
        else:
            start_date = today.replace(day=1)

        if end:
            from datetime import date as date_type  # noqa: F811
            end_date = date_type.fromisoformat(end)
        else:
            end_date = today

        qs = Booking.objects.filter(
            property=prop,
            check_in__gte=start_date,
            check_in__lte=end_date,
        ).exclude(status='cancelled')

        trunc_map = {
            'daily': TruncDay('check_in'),
            'weekly': TruncWeek('check_in'),
            'month': TruncMonth('check_in'),
            'monthly': TruncMonth('check_in'),
        }
        trunc_fn = trunc_map.get(period, TruncDay('check_in'))

        data = list(
            qs.annotate(date=trunc_fn)
            .values('date')
            .annotate(
                revenue_gel=Sum('total_price_gel'),
                bookings_count=Count('id'),
            )
            .order_by('date')
        )

        for item in data:
            item['date'] = item['date'].isoformat() if item['date'] else None

        return Response(data)


class OccupancyReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date as date_type

        prop = request.user.properties.first()
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        today = timezone.localdate()
        start_date = date_type.fromisoformat(start) if start else today.replace(day=1)
        end_date = date_type.fromisoformat(end) if end else today

        total_rooms = Room.objects.filter(
            property=prop, is_active=True,
        ).count()

        if total_rooms == 0:
            return Response([])

        room_nights = (
            RoomNight.objects.filter(
                booking__property=prop,
                date__gte=start_date,
                date__lte=end_date,
            )
            .values('date')
            .annotate(rooms_occupied=Count('room', distinct=True))
            .order_by('date')
        )

        occupied_map = {rn['date']: rn['rooms_occupied'] for rn in room_nights}

        data = []
        current = start_date
        while current <= end_date:
            occupied = occupied_map.get(current, 0)
            data.append({
                'date': current.isoformat(),
                'occupancy_percent': round(occupied / total_rooms * 100, 1),
                'rooms_occupied': occupied,
                'rooms_total': total_rooms,
            })
            current += timedelta(days=1)

        return Response(data)
