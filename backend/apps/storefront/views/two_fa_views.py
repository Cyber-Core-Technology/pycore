from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from apps.storefront.auth import ClienteJWTAuthentication, generar_tokens_cliente
from apps.storefront.permissions import IsClienteStorefront
from apps.storefront.models import ClienteStorefront
from shared.two_fa_service import TwoFAService, TWO_FA_METHOD_TOTP, TWO_FA_METHOD_EMAIL


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'detail': msg}, status=code)


class ClienteTwoFAVerifyView(APIView):
    """
    POST /api/v1/store/<slug>/auth/2fa/verify/
    Body: { temp_token, code }
    """
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request, slug):
        temp_token = (request.data.get('temp_token') or '').strip()
        code       = (request.data.get('code') or '').strip()

        if not temp_token or not code:
            return _err('Faltan campos requeridos.')

        try:
            payload = TwoFAService.verify_temp_token(temp_token)
        except ValueError as e:
            return _err(str(e), status.HTTP_401_UNAUTHORIZED)

        if payload.get('user_type') != 'cliente' or payload.get('slug') != slug:
            return _err('Token inválido.', status.HTTP_401_UNAUTHORIZED)

        try:
            cliente = ClienteStorefront.objects.select_related('empresa').get(
                id=payload['user_id'], activo=True,
            )
        except ClienteStorefront.DoesNotExist:
            return _err('Cliente no encontrado.', status.HTTP_401_UNAUTHORIZED)

        method = payload.get('method')
        if method == TWO_FA_METHOD_TOTP:
            if not TwoFAService.verify_totp(cliente.totp_secret, code):
                return _err('Código incorrecto.')
        elif method == TWO_FA_METHOD_EMAIL:
            if not TwoFAService.verify_email_otp(str(cliente.id), 'cliente', code):
                return _err('Código incorrecto o expirado.')
        else:
            return _err('Método 2FA inválido.')

        tokens = generar_tokens_cliente(cliente)
        return Response({
            **tokens,
            'cliente': {
                'id': str(cliente.id), 'email': cliente.email,
                'nombre': cliente.nombre, 'telefono': cliente.telefono,
            },
        })


class ClienteTwoFAResendEmailView(APIView):
    """
    POST /api/v1/store/<slug>/auth/2fa/resend/
    Body: { temp_token }
    """
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request, slug):
        temp_token = (request.data.get('temp_token') or '').strip()
        try:
            payload = TwoFAService.verify_temp_token(temp_token)
        except ValueError as e:
            return _err(str(e), status.HTTP_401_UNAUTHORIZED)

        if payload.get('method') != TWO_FA_METHOD_EMAIL:
            return _err('Solo disponible para el método de correo.')

        try:
            cliente = ClienteStorefront.objects.get(id=payload['user_id'], activo=True)
        except ClienteStorefront.DoesNotExist:
            return _err('Cliente no encontrado.', status.HTTP_401_UNAUTHORIZED)

        sent = TwoFAService.send_email_otp(str(cliente.id), cliente.email, 'cliente')
        if not sent:
            return _err('No se pudo reenviar el código.', status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'detail': 'Código reenviado a tu correo.'})


class ClienteTwoFASetupView(APIView):
    """
    POST /api/v1/store/<slug>/auth/2fa/setup/
    Body: { method: 'totp' | 'email' }
    """
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes     = [IsClienteStorefront]

    def post(self, request, slug):
        method  = (request.data.get('method') or '').strip()
        cliente = request.user

        if method == TWO_FA_METHOD_TOTP:
            secret = TwoFAService.generate_totp_secret()
            uri    = TwoFAService.get_totp_uri(secret, cliente.email, 'cliente')
            qr_img = TwoFAService.generate_qr_base64(uri)
            cliente.totp_secret = secret
            cliente.save(update_fields=['totp_secret'])
            return Response({'method': TWO_FA_METHOD_TOTP, 'qr_uri': uri, 'qr_image': qr_img, 'secret': secret})

        if method == TWO_FA_METHOD_EMAIL:
            sent = TwoFAService.send_email_otp(str(cliente.id), cliente.email, 'cliente')
            if not sent:
                return _err('No se pudo enviar el código.', status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({'method': TWO_FA_METHOD_EMAIL, 'detail': 'Código enviado a tu correo.'})

        return _err('Método inválido. Usa "totp" o "email".')


class ClienteTwoFAEnableView(APIView):
    """
    POST /api/v1/store/<slug>/auth/2fa/enable/
    Body: { method, code }
    """
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes     = [IsClienteStorefront]

    def post(self, request, slug):
        method  = (request.data.get('method') or '').strip()
        code    = (request.data.get('code') or '').strip()
        cliente = request.user

        if method == TWO_FA_METHOD_TOTP:
            if not cliente.totp_secret:
                return _err('Primero llama a /setup/ para generar el QR.')
            if not TwoFAService.verify_totp(cliente.totp_secret, code):
                return _err('Código incorrecto. Verifica tu app autenticadora.')
        elif method == TWO_FA_METHOD_EMAIL:
            if not TwoFAService.verify_email_otp(str(cliente.id), 'cliente', code):
                return _err('Código incorrecto o expirado.')
        else:
            return _err('Método inválido.')

        cliente.two_fa_enabled = True
        cliente.two_fa_method  = method
        cliente.save(update_fields=['two_fa_enabled', 'two_fa_method'])
        return Response({'detail': f'2FA activado con método: {method}.'})


class ClienteTwoFADisableView(APIView):
    """
    POST /api/v1/store/<slug>/auth/2fa/disable/
    Body: { code }
    """
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes     = [IsClienteStorefront]

    def post(self, request, slug):
        code    = (request.data.get('code') or '').strip()
        cliente = request.user

        if not cliente.two_fa_enabled:
            return _err('El 2FA no está activado.')

        if cliente.two_fa_method == TWO_FA_METHOD_TOTP:
            if not TwoFAService.verify_totp(cliente.totp_secret, code):
                return _err('Código incorrecto.')
        elif cliente.two_fa_method == TWO_FA_METHOD_EMAIL:
            if not TwoFAService.verify_email_otp(str(cliente.id), 'cliente', code):
                return _err('Código incorrecto o expirado.')

        cliente.two_fa_enabled = False
        cliente.two_fa_method  = ''
        cliente.totp_secret    = ''
        cliente.save(update_fields=['two_fa_enabled', 'two_fa_method', 'totp_secret'])
        return Response({'detail': '2FA desactivado.'})
