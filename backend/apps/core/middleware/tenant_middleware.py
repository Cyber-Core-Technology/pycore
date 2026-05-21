from django.http import JsonResponse
from apps.core.models import Empresa


class TenantMiddleware:
    """
    Identifica el tenant (empresa) en cada request.
    Busca el slug de empresa en el header X-Tenant o en el subdominio.
    Lo agrega como request.tenant para uso en views y services.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Rutas que no necesitan tenant
        PUBLIC_PATHS = ['/admin/', '/api/v1/auth/login/', '/api/v1/auth/register/']
        if any(request.path.startswith(p) for p in PUBLIC_PATHS):
            request.tenant = None
            return self.get_response(request)

        # Buscar tenant en header
        tenant_slug = request.headers.get('X-Tenant')

        if tenant_slug:
            try:
                request.tenant = Empresa.objects.get(slug=tenant_slug, activo=True)
            except Empresa.DoesNotExist:
                return JsonResponse({'error': 'Empresa no encontrada o inactiva.'}, status=404)
        else:
            request.tenant = None

        return self.get_response(request)
