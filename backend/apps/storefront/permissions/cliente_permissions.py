from rest_framework.permissions import BasePermission


class IsClienteStorefront(BasePermission):
    """Solo clientes del storefront autenticados."""

    message = 'Se requiere sesión de cliente para esta acción.'

    def has_permission(self, request, view):
        from apps.storefront.models import ClienteStorefront
        return (
            request.user is not None
            and isinstance(request.user, ClienteStorefront)
        )


class IsClienteStorefrontOrReadOnly(BasePermission):
    """GET libre; mutaciones requieren cliente autenticado."""

    message = 'Se requiere sesión de cliente para realizar pedidos.'

    def has_permission(self, request, view):
        from apps.storefront.models import ClienteStorefront
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return (
            request.user is not None
            and isinstance(request.user, ClienteStorefront)
        )
