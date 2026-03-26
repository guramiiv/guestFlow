from rest_framework.exceptions import PermissionDenied


class TenantQuerySetMixin:
    """
    Mixin for ViewSets that automatically filters querysets by the current user's property.
    Prevents cross-tenant data access — the #1 SaaS vulnerability.

    Usage:
        class MyViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
            queryset = MyModel.objects.all()
            tenant_field = 'property__owner'  # default, override if needed
    """
    tenant_field = 'property__owner'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser:
            return qs
        return qs.filter(**{self.tenant_field: user})

    def perform_create(self, serializer):
        """Auto-assign the property on creation."""
        prop = self.request.user.properties.first()
        if not prop:
            raise PermissionDenied("No property associated with this account.")
        serializer.save(property=prop)
