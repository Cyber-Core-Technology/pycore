import json
import logging

from shared.request_context import (
    set_request_context, clear_request_context, get_request_context, was_audited,
)

logger = logging.getLogger(__name__)

# Métodos que mutan estado → se auditan
WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

# Acción genérica según el método HTTP
ACTION_BY_METHOD = {
    'POST':   'registro.creado',
    'PUT':    'registro.actualizado',
    'PATCH':  'registro.actualizado',
    'DELETE': 'registro.eliminado',
}

# Rutas de escritura ruidosas / no-negocio que NO se auditan genéricamente
SKIP_PREFIXES = (
    '/api/v1/auth/token/refresh',   # refresco de token (alta frecuencia)
    '/api/v1/auth/token/verify',
)

# Claves sensibles a redactar en datos_nuevos (coincidencia por substring)
SENSITIVE_KEYS = (
    'password', 'contrasena', 'contraseña', 'token', 'secret', 'authorization',
    'tarjeta', 'card', 'cvv', 'cvc', 'clabe', 'pin', 'private', 'refresh', 'access',
)

# Tamaño máximo de cuerpo a capturar (evita guardar uploads grandes)
MAX_BODY_BYTES = 64 * 1024

REDACTED = '***REDACTED***'


def _get_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _decode_jwt_context(request) -> dict:
    """
    Extrae user_id, email y empresa_id directamente del JWT sin tocar la BD.
    DRF autentica de forma lazy, por lo que en middleware request.user aún es
    AnonymousUser.
    """
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return {}
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        jwt_auth = JWTAuthentication()
        raw_token = jwt_auth.get_raw_token(jwt_auth.get_header(request))
        if raw_token is None:
            return {}
        token = jwt_auth.get_validated_token(raw_token)
        return {
            'user_id':    str(token.get('user_id', '')),
            'user_email': token.get('email', ''),
            'empresa_id': str(token.get('empresa_id', '') or ''),
        }
    except (InvalidToken, TokenError, Exception):
        return {}


def _redact(value):
    """Enmascara recursivamente valores de claves sensibles."""
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if any(s in str(k).lower() for s in SENSITIVE_KEYS):
                out[k] = REDACTED
            else:
                out[k] = _redact(v)
        return out
    if isinstance(value, list):
        return [_redact(v) for v in value]
    return value


def _resolve_tabla(request) -> str:
    """Nombre legible del recurso a partir del ViewSet/View resuelto."""
    rm = getattr(request, 'resolver_match', None)
    if rm is not None and getattr(rm, 'func', None) is not None:
        cls = getattr(rm.func, 'cls', None) or getattr(rm.func, 'view_class', None)
        if cls is not None:
            name = cls.__name__
            for suf in ('ViewSet', 'APIView', 'View'):
                if name.endswith(suf):
                    return name[:-len(suf)]
            return name
    # Fallback: primer segmento significativo de la ruta
    partes = [p for p in request.path.split('/') if p and p not in ('api', 'v1')]
    return partes[0] if partes else ''


def _resolve_id(request, response) -> str:
    """Id del registro afectado: desde los kwargs de la URL o del cuerpo de la respuesta."""
    rm = getattr(request, 'resolver_match', None)
    if rm is not None and rm.kwargs:
        for k, v in rm.kwargs.items():
            if k in ('pk', 'id') or k.startswith('id') or k.endswith('_id'):
                return str(v)
        # única kwarg → probablemente el lookup
        if len(rm.kwargs) == 1:
            return str(next(iter(rm.kwargs.values())))
    data = getattr(response, 'data', None)
    if isinstance(data, dict):
        for k in ('id', 'uuid', 'pk', 'id_venta', 'id_compra', 'id_cxc', 'id_cxp',
                  'id_gasto', 'id_movimiento', 'id_producto'):
            if data.get(k) is not None:
                return str(data[k])
    return ''


class AuditContextMiddleware:
    """
    1) Captura IP + usuario + empresa (desde el JWT) al inicio de cada request
       en thread-local, para que los AuditEventHandler los inyecten sin pasarlos
       explícitamente por cada publisher.
    2) Al finalizar, registra automáticamente toda escritura exitosa
       (POST/PUT/PATCH/DELETE) que NO haya sido ya auditada por un evento de
       dominio — así queda rastro de TODO el CRUD del negocio sin cablear cada
       endpoint.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = _get_ip(request)
        ctx = _decode_jwt_context(request)

        set_request_context(
            ip_address=ip,
            user_id=ctx.get('user_id', ''),
            user_email=ctx.get('user_email', ''),
            empresa_id=ctx.get('empresa_id', ''),
        )

        # Capturar el cuerpo JSON antes de que lo consuma la vista (para datos_nuevos)
        request._audit_body = self._capturar_body(request)

        try:
            response = self.get_response(request)
            try:
                self._auditar_escritura(request, response)
            except Exception as e:
                logger.error(f"[Audit] ❌ Error en auditoría automática: {e}")
            return response
        finally:
            clear_request_context()

    @staticmethod
    def _capturar_body(request):
        if request.method not in WRITE_METHODS:
            return None
        ctype = request.META.get('CONTENT_TYPE', '')
        if 'application/json' not in ctype:
            return None  # ignora multipart/uploads/forms
        try:
            raw = request.body  # Django lo cachea; DRF podrá leerlo igual
            if not raw or len(raw) > MAX_BODY_BYTES:
                return None
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return None

    def _auditar_escritura(self, request, response) -> None:
        if request.method not in WRITE_METHODS:
            return
        status = getattr(response, 'status_code', 0)
        if not (200 <= status < 300):
            return
        path = request.path
        if not path.startswith('/api/'):
            return
        if any(path.startswith(p) for p in SKIP_PREFIXES):
            return
        if was_audited():
            return  # ya lo registró un evento de dominio → no duplicar

        from apps.audit.services import AuditService
        ctx = get_request_context()
        datos = request._audit_body if isinstance(getattr(request, '_audit_body', None), (dict, list)) else None

        accion       = ACTION_BY_METHOD[request.method]
        empresa_id   = ctx.get('empresa_id') or None
        tabla        = _resolve_tabla(request)
        id_registro  = _resolve_id(request, response)
        usuario_email = ctx.get('user_email', '')

        AuditService().registrar(
            accion=accion,
            payload={'metodo': request.method, 'ruta': path},
            id_empresa=empresa_id,
            id_usuario=ctx.get('user_id') or None,
            usuario_email=usuario_email,
            tabla=tabla,
            id_registro=id_registro,
            ip_address=ctx.get('ip_address') or None,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            datos_nuevos=_redact(datos) if datos is not None else None,
        )

        # Empuja el log genérico en tiempo real a la Auditoría (sin reprocesarlo)
        try:
            from shared.events import event_bus
            event_bus.emit_realtime(accion, {
                'id_empresa':    empresa_id,
                'accion':        accion,
                'tabla':         tabla,
                'id_registro':   id_registro,
                'usuario_email': usuario_email,
                'metodo':        request.method,
                'ruta':          path,
            })
        except Exception as e:
            logger.warning(f"[Audit] WS push genérico falló: {e}")
