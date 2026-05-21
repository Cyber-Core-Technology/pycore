from shared.request_context import set_request_context, clear_request_context


def _get_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _decode_jwt_context(request) -> dict:
    """
    Extrae user_id y email directamente del JWT sin hacer queries a la BD.
    DRF autentica de forma lazy (al acceder request.user en el view),
    por lo que en middleware request.user todavía es AnonymousUser.
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
        }
    except (InvalidToken, TokenError, Exception):
        return {}


class AuditContextMiddleware:
    """
    Captura IP + usuario autenticado al inicio de cada request y los guarda
    en thread-local para que AuditEventHandler los inyecte en todos los logs
    sin necesidad de pasarlos explícitamente por cada publisher.
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
        )

        try:
            response = self.get_response(request)
        finally:
            clear_request_context()

        return response
