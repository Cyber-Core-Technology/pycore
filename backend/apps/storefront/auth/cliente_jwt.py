"""
Autenticación JWT para clientes del storefront público.
Usa el mismo secreto que el ERP pero con claim tipo='storefront_customer'
para evitar que tokens del ERP sirvan aquí y viceversa.
"""
import jwt
from django.conf import settings
from datetime import datetime, timedelta, timezone

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


_ALGORITHM  = 'HS256'
_ACCESS_TTL  = timedelta(hours=24)
_REFRESH_TTL = timedelta(days=30)
_TOKEN_TYPE  = 'storefront_customer'


def _secret():
    return settings.SECRET_KEY


def generar_tokens_cliente(cliente) -> dict:
    now = datetime.now(tz=timezone.utc)

    access_payload = {
        'tipo':       _TOKEN_TYPE,
        'sub_type':   'access',
        'cliente_id': str(cliente.id),
        'empresa_id': str(cliente.empresa_id),
        'slug':       cliente.empresa.slug,
        'email':      cliente.email,
        'nombre':     cliente.nombre,
        'iat':        now,
        'exp':        now + _ACCESS_TTL,
    }
    refresh_payload = {
        'tipo':       _TOKEN_TYPE,
        'sub_type':   'refresh',
        'cliente_id': str(cliente.id),
        'empresa_id': str(cliente.empresa_id),
        'slug':       cliente.empresa.slug,
        'iat':        now,
        'exp':        now + _REFRESH_TTL,
    }
    return {
        'access':  jwt.encode(access_payload,  _secret(), algorithm=_ALGORITHM),
        'refresh': jwt.encode(refresh_payload, _secret(), algorithm=_ALGORITHM),
    }


def decodificar_token_cliente(token: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Token de cliente expirado.')
    except jwt.InvalidTokenError:
        raise AuthenticationFailed('Token de cliente inválido.')

    if payload.get('tipo') != _TOKEN_TYPE:
        raise AuthenticationFailed('Token no es de cliente storefront.')
    return payload


class ClienteJWTAuthentication(BaseAuthentication):
    """
    DRF authentication class.
    Lee el header 'Authorization: Bearer <token>' o
    'X-Storefront-Token: <token>' y retorna (ClienteStorefront, token).
    """

    def authenticate(self, request):
        from apps.storefront.models import ClienteStorefront

        token = self._get_raw_token(request)
        if not token:
            return None

        try:
            payload = decodificar_token_cliente(token)
        except AuthenticationFailed:
            return None

        if payload.get('sub_type') != 'access':
            return None

        try:
            cliente = ClienteStorefront.objects.select_related('empresa').get(
                id=payload['cliente_id'],
                activo=True,
            )
        except ClienteStorefront.DoesNotExist:
            raise AuthenticationFailed('Cliente no encontrado o inactivo.')

        return (cliente, token)

    def _get_raw_token(self, request) -> str | None:
        # Header dedicado (preferido en el storefront)
        dedicated = request.headers.get('X-Storefront-Token', '').strip()
        if dedicated:
            return dedicated

        # Fallback: Authorization: Bearer ...
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:].strip()
        return None
