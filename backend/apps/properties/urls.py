from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'rooms', views.RoomViewSet, basename='room')

urlpatterns = [
    path('', views.PropertyView.as_view(), name='property-detail'),
    path('upload-photo/', views.PhotoUploadView.as_view(), name='photo-upload'),
    path('share/', views.ShareInfoView.as_view(), name='share-info'),
    path('share/qr/', views.QRCodeView.as_view(), name='share-qr'),
    path('share/track/', views.ShareTrackView.as_view(), name='share-track'),
    path('', include(router.urls)),
]
