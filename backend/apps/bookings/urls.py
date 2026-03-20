from django.urls import include, path
from django.urls.converters import StringConverter
from django.urls import register_converter
from rest_framework.routers import DefaultRouter

from . import views
from apps.properties.views import PublicSeoDataView


class UnicodeSlugConverter(StringConverter):
    regex = r'[-\w]+'


register_converter(UnicodeSlugConverter, 'uslug')

router = DefaultRouter()
router.register(r'', views.BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]

# Public (unauthenticated) URL patterns — included at api/public/ in config/urls.py
public_urlpatterns = [
    path('<uslug:slug>/', views.PublicPropertyView.as_view(), name='public-property'),
    path('<uslug:slug>/availability/', views.PublicAvailabilityView.as_view(), name='public-availability'),
    path('<uslug:slug>/book/', views.PublicCreateBookingView.as_view(), name='public-book'),
    path('<uslug:slug>/booking/<int:booking_id>/', views.PublicBookingStatusView.as_view(), name='public-booking-status'),
    path('<uslug:slug>/qr/', views.PublicQRCodeView.as_view(), name='public-qr'),
    path('<uslug:slug>/seo/', PublicSeoDataView.as_view(), name='public-seo'),
]
