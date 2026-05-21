from django.http import JsonResponse


SUCURSAL_EXEMPT_PREFIXES = [
    '/admin/',
    '/api/v1/auth/login/',
    '/api/v1/auth/register/',
    '/api/v1/auth/token/refresh/',
    '/api/v1/auth/logout/',
    '/api/v1/auth/me/sucursales',
    '/ws/',
    '/p/',
    '/scan/',
    '/privacidad',
    '/terminos',
]


class SucursalMiddleware:
    """
    Lee el header X-Sucursal-ID e inyecta request.sucursal.
    Si el header está presente pero la sucursal no existe o está inactiva → 400.
    Si el header no está presente → request.sucursal = None (sin restricción).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if any(request.path.startswith(p) for p in SUCURSAL_EXEMPT_PREFIXES):
            request.sucursal = None
            return self.get_response(request)

        sucursal_id = request.headers.get('X-Sucursal-ID')
        if sucursal_id:
            try:
                from apps.core.models import Sucursal
                request.sucursal = Sucursal.objects.select_related('empresa').get(
                    id_sucursal=sucursal_id,
                    activo=True,
                )
            except Exception:
                return JsonResponse(
                    {'error': 'Sucursal no encontrada o inactiva.', 'code': 'sucursal_invalid'},
                    status=400,
                )
        else:
            request.sucursal = None

        return self.get_response(request)
