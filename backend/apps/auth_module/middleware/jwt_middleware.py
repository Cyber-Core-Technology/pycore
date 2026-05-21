# Este middleware es opcional ya que DRF+SimpleJWT
# maneja la autenticación automáticamente.
# Se usa para enriquecer request.tenant desde el JWT.

from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTTenantMiddleware(MiddlewareMixin):
    """
    Extrae empresa_id del JWT y lo inyecta en request
    como complemento al TenantMiddleware del header X-Tenant.
    """

    def process_request(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return

        try:
            jwt_auth = JWTAuthentication()
            raw_token = jwt_auth.get_raw_token(
                jwt_auth.get_header(request)
            )
            if raw_token is None:
                return
            validated_token = jwt_auth.get_validated_token(raw_token)
            empresa_id = validated_token.get('empresa_id')
            if empresa_id and not getattr(request, 'tenant', None):
                # Si TenantMiddleware no pudo identificar el tenant por header,
                # usamos el del JWT
                from apps.core.models import Empresa
                try:
                    request.tenant = Empresa.objects.get(id_empresa=empresa_id, activo=True)
                except Empresa.DoesNotExist:
                    pass
        except (InvalidToken, TokenError):
            pass
