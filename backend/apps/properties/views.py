import io

import cloudinary.uploader
import qrcode
from django.http import HttpResponse
from rest_framework import generics, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Property, Room, SeasonalRate, ShareEvent
from .serializers import (
    PropertySerializer,
    PropertyUpdateSerializer,
    RoomCreateSerializer,
    RoomSerializer,
)


class PropertyView(generics.RetrieveUpdateAPIView):
    """GET returns current user's property, PATCH updates it."""

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return PropertyUpdateSerializer
        return PropertySerializer

    def get_object(self):
        prop, _created = Property.objects.get_or_create(
            owner=self.request.user,
            defaults={
                'name_ka': 'ჩემი სასტუმრო',
                'region': 'tbilisi',
                'phone': getattr(self.request.user, 'phone', ''),
                'email': self.request.user.email,
            },
        )
        return prop


class RoomViewSet(viewsets.ModelViewSet):
    """CRUD for rooms, filtered by the current user's property."""

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RoomCreateSerializer
        return RoomSerializer

    def get_queryset(self):
        return (
            Room.objects.filter(property__owner=self.request.user)
            .select_related('property')
            .prefetch_related('seasonal_rates')
        )

    def perform_create(self, serializer):
        prop = Property.objects.filter(owner=self.request.user).first()
        serializer.save(property=prop)


class PhotoUploadView(APIView):
    """Upload one or more images to Cloudinary. Returns list of secure URLs."""

    parser_classes = [MultiPartParser]

    def post(self, request):
        files = request.FILES.getlist('files')
        if not files:
            return Response({'detail': 'No files provided.'}, status=400)

        prop = Property.objects.filter(owner=request.user).first()
        if not prop:
            return Response({'detail': 'No property found.'}, status=404)

        folder = f"guestflow/{prop.slug}"
        urls = []
        for f in files:
            result = cloudinary.uploader.upload(
                f,
                folder=folder,
                resource_type="image",
                transformation=[
                    {"width": 1200, "height": 800, "crop": "limit", "quality": "auto", "fetch_format": "auto"}
                ],
            )
            urls.append(result['secure_url'])

        return Response({'urls': urls})


REGION_KA = {
    'tbilisi': 'თბილისი',
    'kakheti': 'კახეთი',
    'imereti': 'იმერეთი',
    'adjara': 'აჭარა',
    'svaneti': 'სვანეთი',
    'mtskheta_mtianeti': 'მცხეთა-მთიანეთი',
    'guria': 'გურია',
    'samegrelo': 'სამეგრელო',
    'racha': 'რაჭა',
    'kvemo_kartli': 'ქვემო ქართლი',
    'shida_kartli': 'შიდა ქართლი',
    'samtskhe_javakheti': 'სამცხე-ჯავახეთი',
}


class ShareInfoView(APIView):
    """Return all info an owner needs to share their booking page."""

    def get(self, request):
        prop = Property.objects.filter(owner=request.user).first()
        if not prop:
            return Response({'detail': 'No property found.'}, status=404)

        origin = request.META.get('HTTP_ORIGIN', '').rstrip('/')
        if not origin:
            referer = request.META.get('HTTP_REFERER', '')
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
        if not origin:
            origin = 'https://guestflow.ge'
        booking_url = f"{origin}/book/{prop.slug}"
        region_ka = REGION_KA.get(prop.region, prop.region)

        # Min price across active rooms
        active_rooms = Room.objects.filter(property=prop, is_active=True)
        total_rooms = active_rooms.count()
        price_from = active_rooms.order_by('base_price_gel').values_list(
            'base_price_gel', flat=True
        ).first()
        price_from_gel = float(price_from) if price_from else 0

        # Short descriptions
        desc_ka = (prop.description_ka[:160] if prop.description_ka else '')
        desc_en = (prop.description_en[:160] if prop.description_en else '')

        photos = prop.photos or []
        has_photos = len(photos) > 0
        cover_photo_url = photos[0] if has_photos else None

        # Build social captions
        def caption(template):
            return template.format(
                property_name_ka=prop.name_ka,
                property_name_en=prop.name_en or prop.name_ka,
                city=prop.city,
                region_ka=region_ka,
                price_from=price_from_gel,
                url=booking_url,
            )

        social_captions = {
            'facebook_ka': caption(
                '🏠 დაჯავშნეთ ადგილი ჩვენს სასტუმრო სახლში!\n'
                '📍 {city}, {region_ka}\n'
                '💰 ფასები ₾{price_from}-დან\n'
                '🔗 დაჯავშნეთ ონლაინ: {url}'
            ),
            'facebook_en': caption(
                '🏠 Book your stay at {property_name_en}!\n'
                '📍 {city}, {region_ka}\n'
                '💰 From ₾{price_from}/night\n'
                '🔗 Book online: {url}'
            ),
            'instagram_ka': caption(
                '🏠 {property_name_ka}\n'
                '📍 {city}, {region_ka}\n'
                '💰 ₾{price_from}-დან\n\n'
                'დაჯავშნეთ ონლაინ — ლინკი ბიოში! 👆\n\n'
                '#საქართველო #კახეთი #სასტუმრო #გესტჰაუსი #ტურიზმი #Georgia #Travel'
            ),
            'instagram_en': caption(
                '🏠 {property_name_en}\n'
                '📍 {city}, {region_ka}\n'
                '💰 From ₾{price_from}/night\n\n'
                'Book online — link in bio! 👆\n\n'
                '#Georgia #Kakheti #GuestHouse #Travel #Caucasus'
            ),
            'whatsapp_ka': caption(
                'გამარჯობა! გეპატიჟებით ჩვენს სასტუმრო სახლში — '
                '{property_name_ka}, {city}. ფასები ₾{price_from}-დან. '
                'დაჯავშნეთ ონლაინ: {url}'
            ),
            'whatsapp_en': caption(
                'Hello! Welcome to {property_name_en} in {city}, Georgia. '
                'Rates from ₾{price_from}/night. Book online: {url}'
            ),
            'sms_ka': caption(
                'დაჯავშნეთ ადგილი: {property_name_ka}, {city}. '
                '₾{price_from}-დან. {url}'
            ),
            'viber_ka': caption(
                '🏠 {property_name_ka}\n'
                '📍 {city}, {region_ka}\n'
                '💰 ₾{price_from}-დან\n'
                '🔗 {url}'
            ),
        }

        return Response({
            'booking_url': booking_url,
            'property_name_ka': prop.name_ka,
            'property_name_en': prop.name_en or prop.name_ka,
            'property_type': prop.property_type,
            'city': prop.city,
            'region': prop.region,
            'region_ka': region_ka,
            'total_rooms': total_rooms,
            'price_from_gel': price_from_gel,
            'description_short_ka': desc_ka,
            'description_short_en': desc_en,
            'has_photos': has_photos,
            'cover_photo_url': cover_photo_url,
            'social_captions': social_captions,
            'qr_code_url': '/api/property/share/qr/',
        })


class QRCodeView(APIView):
    """Generate a QR code PNG for the property's booking URL."""

    def get(self, request):
        prop = Property.objects.filter(owner=request.user).first()
        if not prop:
            return Response({'detail': 'No property found.'}, status=404)

        origin = request.META.get('HTTP_ORIGIN', '').rstrip('/')
        if not origin:
            referer = request.META.get('HTTP_REFERER', '')
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
        if not origin:
            origin = 'https://guestflow.ge'
        booking_url = f"{origin}/book/{prop.slug}"

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

        return HttpResponse(buf.getvalue(), content_type='image/png')


class PublicSeoDataView(APIView):
    """Return all data needed to build JSON-LD structured data for a property."""

    permission_classes = []
    authentication_classes = []

    def get(self, request, slug):
        from django.utils import timezone

        try:
            prop = Property.objects.get(slug=slug, is_active=True)
        except Property.DoesNotExist:
            raise NotFound('Property not found.')

        active_rooms = Room.objects.filter(property=prop, is_active=True)
        today = timezone.now().date()

        rooms_data = []
        prices = []
        for room in active_rooms:
            base = float(room.base_price_gel)
            # Check for an applicable seasonal rate
            seasonal = (
                SeasonalRate.objects.filter(
                    room=room,
                    start_date__lte=today,
                    end_date__gte=today,
                )
                .order_by('-price_gel')
                .first()
            )
            effective = float(seasonal.price_gel) if seasonal else base
            prices.append(base)
            rooms_data.append({
                'name_en': room.name_en,
                'name_ka': room.name_ka,
                'room_type': room.room_type,
                'max_guests': room.max_guests,
                'base_price_gel': base,
                'effective_price_gel': effective,
                'description_en': room.description_en,
                'amenities': room.amenities or [],
            })

        region_ka = REGION_KA.get(prop.region, prop.region)
        booking_url = f'https://guestflow.ge/book/{prop.slug}'

        return Response({
            'property': {
                'name_ka': prop.name_ka,
                'name_en': prop.name_en,
                'slug': prop.slug,
                'property_type': prop.property_type,
                'description_ka': prop.description_ka,
                'description_en': prop.description_en,
                'address_ka': prop.address_ka,
                'city': prop.city,
                'region': prop.get_region_display(),
                'region_ka': region_ka,
                'country': 'GE',
                'latitude': float(prop.latitude) if prop.latitude else None,
                'longitude': float(prop.longitude) if prop.longitude else None,
                'phone': prop.phone,
                'email': prop.email,
                'check_in_time': prop.check_in_time.strftime('%H:%M') if prop.check_in_time else None,
                'check_out_time': prop.check_out_time.strftime('%H:%M') if prop.check_out_time else None,
                'photos': prop.photos or [],
                'amenities': prop.amenities or [],
            },
            'rooms': rooms_data,
            'pricing': {
                'currency': 'GEL',
                'min_price': min(prices) if prices else None,
                'max_price': max(prices) if prices else None,
            },
            'stats': {
                'total_rooms': active_rooms.count(),
                'total_reviews': 0,
                'average_rating': None,
            },
            'urls': {
                'booking_url': booking_url,
                'canonical_url': booking_url,
            },
        })


class ShareTrackView(APIView):
    """Record a share event for the current user's property."""

    def post(self, request):
        prop = Property.objects.filter(owner=request.user).first()
        if not prop:
            return Response({'detail': 'No property found.'}, status=404)

        platform = request.data.get('platform', '')
        valid_platforms = [c[0] for c in ShareEvent.PLATFORM_CHOICES]
        if platform not in valid_platforms:
            return Response(
                {'detail': f'Invalid platform. Choose from: {", ".join(valid_platforms)}'},
                status=400,
            )

        ShareEvent.objects.create(property=prop, platform=platform)
        return Response({'status': 'ok'}, status=201)


class SitemapView(APIView):
    """Dynamic XML sitemap with image extensions."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        from xml.sax.saxutils import escape

        base = 'https://guestflow.ge'
        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
            '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ]

        # Static pages
        static_pages = [
            ('/', '1.0', 'weekly'),
            ('/login', '0.3', 'monthly'),
            ('/register', '0.3', 'monthly'),
        ]
        for path, priority, freq in static_pages:
            lines.append('  <url>')
            lines.append(f'    <loc>{base}{path}</loc>')
            lines.append(f'    <changefreq>{freq}</changefreq>')
            lines.append(f'    <priority>{priority}</priority>')
            lines.append('  </url>')

        # Active properties
        properties = Property.objects.filter(is_active=True).order_by('created_at')
        for prop in properties:
            name_en = escape(prop.name_en or prop.name_ka)
            name_ka = escape(prop.name_ka)
            city = escape(prop.city)
            region_ka = escape(REGION_KA.get(prop.region, prop.region))
            lastmod = prop.updated_at.strftime('%Y-%m-%d')

            lines.append('  <url>')
            lines.append(f'    <loc>{base}/book/{prop.slug}</loc>')
            lines.append(f'    <lastmod>{lastmod}</lastmod>')
            lines.append('    <changefreq>daily</changefreq>')
            lines.append('    <priority>0.8</priority>')

            for photo_url in (prop.photos or []):
                lines.append('    <image:image>')
                lines.append(f'      <image:loc>{escape(photo_url)}</image:loc>')
                lines.append(f'      <image:title>{name_en}</image:title>')
                lines.append(f'      <image:caption>{name_ka} - {city}, {region_ka}</image:caption>')
                lines.append('    </image:image>')

            lines.append('  </url>')

        lines.append('</urlset>')
        return HttpResponse('\n'.join(lines), content_type='application/xml')


class RobotsTxtView(APIView):
    """Serve robots.txt."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        content = (
            'User-agent: *\n'
            'Allow: /\n'
            'Allow: /book/\n'
            '\n'
            'Disallow: /dashboard/\n'
            'Disallow: /api/\n'
            'Disallow: /admin/\n'
            'Disallow: /login\n'
            'Disallow: /register\n'
            'Disallow: /settings/\n'
            '\n'
            'Sitemap: https://guestflow.ge/sitemap.xml\n'
        )
        return HttpResponse(content, content_type='text/plain')
