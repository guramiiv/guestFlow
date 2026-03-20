from rest_framework import viewsets, filters

from .models import Guest
from .serializers import GuestSerializer, GuestDetailSerializer


class GuestViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    def get_queryset(self):
        return Guest.objects.filter(property__owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GuestDetailSerializer
        return GuestSerializer

    def perform_create(self, serializer):
        prop = self.request.user.properties.first()
        serializer.save(property=prop)
