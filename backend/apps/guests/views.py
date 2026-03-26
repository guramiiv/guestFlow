from rest_framework import viewsets, filters

from apps.core.mixins import TenantQuerySetMixin
from apps.core.models import SensitiveDataAccessLog

from .models import Guest
from .serializers import GuestSerializer, GuestCreateUpdateSerializer, GuestDetailSerializer


class GuestViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = Guest.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GuestDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return GuestCreateUpdateSerializer
        return GuestSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        guest = self.get_object()
        if guest.id_number:
            SensitiveDataAccessLog.log(
                request,
                action='view_id_number',
                target_model='Guest',
                target_id=guest.id,
            )
        return response
