from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from apps.bookings.urls import public_urlpatterns as public_booking_urls
from apps.core.throttles import LoginRateThrottle
from apps.properties.views import RobotsTxtView, SitemapView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]


urlpatterns = [
    path('sitemap.xml', SitemapView.as_view(), name='sitemap'),
    path('robots.txt', RobotsTxtView.as_view(), name='robots-txt'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/auth/token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/property/', include('apps.properties.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/guests/', include('apps.guests.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/public/', include(public_booking_urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
