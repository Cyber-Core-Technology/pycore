import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from shared.two_fa_service import TwoFAService, TWO_FA_METHOD_TOTP, TWO_FA_METHOD_EMAIL
from shared.events import event_bus, DomainEvents
from apps.auth_module.services import AuthService
from apps.auth_module.repositories import UsuarioRepository

logger = logging.getLogger(__name__)
auth_service = AuthService()
repo = UsuarioRepository()


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'detail': msg}, status=code)


class TwoFAVerifyView(APIView):
    """
    POST /api/v1/auth/2fa/verify/
    Body: { temp_token, code }
    Verifica el código TOTP o email OTP y devuelve los tokens reales.
    """
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request):
        temp_token = (request.data.get('temp_token') or '').strip()
        code       = (request.data.get('code') or '').strip()

        if not temp_token or not code:
            return _err('Faltan campos requeridos.')

        try:
            payload = TwoFAService.verify_temp_token(temp_token)
        except ValueError as e:
            return _err(str(e), status.HTTP_401_UNAUTHORIZED)

        if payload.get('user_type') != 'usuario':
            return _err('Token inválido.', status.HTTP_401_UNAUTHORIZED)

        try:
            usuario = repo.get_by_id(payload['user_id'])
        except Exception:
            usuario = None
        if not usuario or not usuario.activo:
            return _err('Usuario no encontrado.', status.HTTP_401_UNAUTHORIZED)

        method = payload.get('method')
        if method == TWO_FA_METHOD_TOTP:
            if not TwoFAService.verify_totp(usuario.totp_secret, code):
                return _err('Código incorrecto.')
        elif method == TWO_FA_METHOD_EMAIL:
            if not TwoFAService.verify_email_otp(str(usuario.id), 'usuario', code):
                return _err('Código incorrecto o expirado.')
        else:
            return _err('Método 2FA inválido.')

        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR', '')
        )
        try:
            event_bus.publish(DomainEvents.USUARIO_LOGIN, {
                'usuario_id':    str(usuario.id),
                'id_empresa':    str(usuario.empresa_id) if usuario.empresa_id else None,
                'usuario_email': usuario.email,
                'ip_address':    ip,
                'user_agent':    request.META.get('HTTP_USER_AGENT', ''),
            })
        except Exception as e:
            logger.warning(f"[2FA] No se pudo publicar evento login: {e}")

        tokens = auth_service._generar_tokens(usuario)
        trust_token = TwoFAService.generate_trust_token(str(usuario.id), 'usuario')
        return Response({
            **tokens,
            'usuario': auth_service._datos_usuario(usuario),
            'trust_token': trust_token,
        })


class TwoFASetupView(APIView):
    """
    POST /api/v1/auth/me/2fa/setup/
    Body: { method: 'totp' | 'email' }
    Para TOTP devuelve qr_uri y qr_image (base64).
    Para email simplemente confirma el método y envía el primer OTP de prueba.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        method = (request.data.get('method') or '').strip()
        if method not in (TWO_FA_METHOD_TOTP, TWO_FA_METHOD_EMAIL):
            return _err('Método inválido. Usa "totp" o "email".')

        usuario = request.user

        if method == TWO_FA_METHOD_TOTP:
            secret  = TwoFAService.generate_totp_secret()
            uri     = TwoFAService.get_totp_uri(secret, usuario.email, 'usuario')
            qr_img  = TwoFAService.generate_qr_base64(uri)
            # Guardamos el secret provisionalmente (se activa al confirmar)
            usuario.totp_secret = secret
            usuario.save(update_fields=['totp_secret'])
            return Response({
                'method':   TWO_FA_METHOD_TOTP,
                'qr_uri':   uri,
                'qr_image': qr_img,
                'secret':   secret,
            })

        # method == 'email'
        sent = TwoFAService.send_email_otp(str(usuario.id), usuario.email, 'usuario')
        if not sent:
            return _err('No se pudo enviar el código. Inténtalo de nuevo.', status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'method': TWO_FA_METHOD_EMAIL, 'detail': 'Código enviado a tu correo.'})


class TwoFAEnableView(APIView):
    """
    POST /api/v1/auth/me/2fa/enable/
    Body: { method, code }
    Valida el código y activa el 2FA.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        method = (request.data.get('method') or '').strip()
        code   = (request.data.get('code') or '').strip()
        usuario = request.user

        if method == TWO_FA_METHOD_TOTP:
            if not usuario.totp_secret:
                return _err('Primero llama a /setup/ para generar el QR.')
            if not TwoFAService.verify_totp(usuario.totp_secret, code):
                return _err('Código incorrecto. Verifica tu app autenticadora.')
        elif method == TWO_FA_METHOD_EMAIL:
            if not TwoFAService.verify_email_otp(str(usuario.id), 'usuario', code):
                return _err('Código incorrecto o expirado.')
        else:
            return _err('Método inválido.')

        usuario.two_fa_enabled = True
        usuario.two_fa_method  = method
        usuario.save(update_fields=['two_fa_enabled', 'two_fa_method'])
        return Response({'detail': f'2FA activado con método: {method}.'})


class TwoFADisableView(APIView):
    """
    POST /api/v1/auth/me/2fa/disable/
    Body: { code }
    Desactiva el 2FA verificando un código válido.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code    = (request.data.get('code') or '').strip()
        usuario = request.user

        if not usuario.two_fa_enabled:
            return _err('El 2FA no está activado.')

        if usuario.two_fa_method == TWO_FA_METHOD_TOTP:
            if not TwoFAService.verify_totp(usuario.totp_secret, code):
                return _err('Código incorrecto.')
        elif usuario.two_fa_method == TWO_FA_METHOD_EMAIL:
            if not TwoFAService.verify_email_otp(str(usuario.id), 'usuario', code):
                return _err('Código incorrecto o expirado.')

        usuario.two_fa_enabled = False
        usuario.two_fa_method  = ''
        usuario.totp_secret    = ''
        usuario.save(update_fields=['two_fa_enabled', 'two_fa_method', 'totp_secret'])
        return Response({'detail': '2FA desactivado.'})


class TwoFAResendEmailView(APIView):
    """
    POST /api/v1/auth/2fa/resend/
    Body: { temp_token }
    Reenvía el OTP por email durante el flujo de login.
    """
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request):
        temp_token = (request.data.get('temp_token') or '').strip()
        try:
            payload = TwoFAService.verify_temp_token(temp_token)
        except ValueError as e:
            return _err(str(e), status.HTTP_401_UNAUTHORIZED)

        if payload.get('method') != TWO_FA_METHOD_EMAIL:
            return _err('Solo disponible para el método de correo.')

        try:
            usuario = repo.get_by_id(payload['user_id'])
        except Exception:
            usuario = None
        if not usuario:
            return _err('Usuario no encontrado.', status.HTTP_401_UNAUTHORIZED)

        sent = TwoFAService.send_email_otp(str(usuario.id), usuario.email, 'usuario')
        if not sent:
            return _err('No se pudo reenviar el código.', status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'detail': 'Código reenviado a tu correo.'})
