"""
JWT authentication middleware for Django Channels WebSocket connections.

Tokens are passed via query string: ws://host/ws/empresa/?token=<access_token>
On success, the scope is enriched with:
  - scope['user']       → Usuario instance (or AnonymousUser)
  - scope['empresa_id'] → UUID string of the tenant
  - scope['sucursal_id'] → UUID string or None
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_user_from_token(token_str: str):
    """
    Validates the JWT access token and returns (user, empresa_id, sucursal_id).
    Raises InvalidToken / TokenError on failure.
    """
    from apps.auth_module.models import Usuario

    token = AccessToken(token_str)
    user_id = token.get('user_id')
    empresa_id = token.get('empresa_id')
    sucursal_id = token.get('sucursal_id')

    user = Usuario.objects.select_related('empresa').get(pk=user_id, activo=True)
    return user, str(empresa_id) if empresa_id else None, str(sucursal_id) if sucursal_id else None


class JWTAuthMiddleware(BaseMiddleware):
    """
    Wraps URLRouter. Extracts ?token= from the WS handshake query string,
    validates it, and injects user / empresa_id into the scope.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token', [])

        if token_list:
            try:
                user, empresa_id, sucursal_id = await _get_user_from_token(token_list[0])
                scope['user'] = user
                scope['empresa_id'] = empresa_id
                scope['sucursal_id'] = sucursal_id
            except (InvalidToken, TokenError, Exception) as e:
                logger.warning(f'[WS] Token inválido: {e}')
                scope['user'] = AnonymousUser()
                scope['empresa_id'] = None
                scope['sucursal_id'] = None
        else:
            scope['user'] = AnonymousUser()
            scope['empresa_id'] = None
            scope['sucursal_id'] = None

        return await super().__call__(scope, receive, send)
