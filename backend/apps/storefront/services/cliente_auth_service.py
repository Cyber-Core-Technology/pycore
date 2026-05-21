import logging
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from shared.two_fa_service import TwoFAService, TWO_FA_METHOD_EMAIL

from apps.storefront.models import ClienteStorefront
from apps.storefront.auth import generar_tokens_cliente
from apps.storefront.services.storefront_service import StorefrontService

logger = logging.getLogger(__name__)


class ClienteAuthService:

    @staticmethod
    def registrar(slug: str, email: str, nombre: str, password: str, telefono: str = '', acepto_privacidad: bool = False) -> dict:
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            raise ValueError('Tienda no encontrada.')

        if ClienteStorefront.objects.filter(empresa=config.empresa, email=email.lower()).exists():
            raise ValueError('Ya existe una cuenta con ese correo en esta tienda.')

        with transaction.atomic():
            ahora = timezone.now()
            cliente = ClienteStorefront(
                empresa                 = config.empresa,
                email                   = email.lower().strip(),
                nombre                  = nombre.strip(),
                telefono                = telefono.strip(),
                acepto_privacidad       = acepto_privacidad,
                fecha_acepto_privacidad = ahora if acepto_privacidad else None,
            )
            cliente.set_password(password)
            cliente.save()

        logger.info('Nuevo cliente storefront registrado: %s en %s', email, slug)
        tokens = generar_tokens_cliente(cliente)
        return {
            **tokens,
            'cliente': ClienteAuthService._datos_cliente(cliente),
        }

    @staticmethod
    def login(slug: str, email: str, password: str) -> dict:
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            raise ValueError('Tienda no encontrada.')

        try:
            cliente = ClienteStorefront.objects.select_related('empresa').get(
                empresa=config.empresa,
                email=email.lower().strip(),
            )
        except ClienteStorefront.DoesNotExist:
            raise ValueError('Correo o contraseña incorrectos.')

        if not cliente.activo:
            raise ValueError('Esta cuenta está desactivada.')

        if not cliente.check_password(password):
            raise ValueError('Correo o contraseña incorrectos.')

        two_fa = ClienteAuthService._check_two_fa(cliente, slug)
        if two_fa:
            return two_fa

        tokens = generar_tokens_cliente(cliente)
        return {
            **tokens,
            'cliente': ClienteAuthService._datos_cliente(cliente),
        }

    @staticmethod
    def refresh(refresh_token: str) -> dict:
        from apps.storefront.auth import decodificar_token_cliente
        from rest_framework.exceptions import AuthenticationFailed

        try:
            payload = decodificar_token_cliente(refresh_token)
        except AuthenticationFailed as e:
            raise ValueError(str(e.detail))

        if payload.get('sub_type') != 'refresh':
            raise ValueError('Token no es de tipo refresh.')

        try:
            cliente = ClienteStorefront.objects.select_related('empresa').get(
                id=payload['cliente_id'],
                activo=True,
            )
        except ClienteStorefront.DoesNotExist:
            raise ValueError('Cliente no encontrado.')

        tokens = generar_tokens_cliente(cliente)
        return {'access': tokens['access']}

    @staticmethod
    def _check_two_fa(cliente, slug: str) -> dict | None:
        """Si el cliente tiene 2FA activo devuelve la respuesta intermedia, si no None."""
        if not (cliente.two_fa_enabled and cliente.two_fa_method):
            return None
        if cliente.two_fa_method == TWO_FA_METHOD_EMAIL:
            sent = TwoFAService.send_email_otp(str(cliente.id), cliente.email, 'cliente')
            if not sent:
                raise ValueError('No se pudo enviar el código de verificación.')
        temp_token = TwoFAService.generate_temp_token(
            user_id=str(cliente.id),
            user_type='cliente',
            method=cliente.two_fa_method,
            empresa_id=str(cliente.empresa_id),
            slug=slug,
        )
        return {
            'requires_2fa': True,
            'two_fa_method': cliente.two_fa_method,
            'temp_token': temp_token,
        }

    @staticmethod
    def google_login(slug: str, credential: str, acepto_privacidad: bool = False) -> dict:
        """
        Verifica el id_token de Google, luego hace find-or-create del ClienteStorefront.
        Si el email ya existe en la tienda, vincula el google_id sin crear cuenta nueva.
        """
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            raise ValueError('Tienda no encontrada.')

        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        try:
            info = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except Exception:
            raise ValueError('Token de Google inválido o expirado.')

        google_sub  = info['sub']
        email       = info['email'].lower().strip()
        nombre      = info.get('name') or info.get('given_name') or email.split('@')[0]
        foto_url    = info.get('picture', '')

        with transaction.atomic():
            # 1. Buscar por google_id (ya vinculado)
            cliente = ClienteStorefront.objects.filter(google_id=google_sub).select_related('empresa').first()

            if cliente:
                if not cliente.activo:
                    raise ValueError('Esta cuenta está desactivada.')
            else:
                # 2. Buscar por (empresa, email) — cuenta de email existente
                cliente = ClienteStorefront.objects.filter(
                    empresa=config.empresa,
                    email=email,
                ).select_related('empresa').first()

                if cliente:
                    if not cliente.activo:
                        raise ValueError('Esta cuenta está desactivada.')
                    # Vincular google_id a la cuenta existente
                    cliente.google_id     = google_sub
                    cliente.auth_provider = ClienteStorefront.AUTH_PROVIDER_GOOGLE
                    cliente.email_verificado = True
                    cliente.save(update_fields=['google_id', 'auth_provider', 'email_verificado'])
                else:
                    # 3. Crear nueva cuenta
                    ahora = timezone.now()
                    cliente = ClienteStorefront.objects.create(
                        empresa                 = config.empresa,
                        email                   = email,
                        nombre                  = nombre,
                        auth_provider           = ClienteStorefront.AUTH_PROVIDER_GOOGLE,
                        google_id               = google_sub,
                        email_verificado        = True,
                        acepto_privacidad       = acepto_privacidad,
                        fecha_acepto_privacidad = ahora if acepto_privacidad else None,
                    )

        logger.info('Google OAuth storefront: %s en %s', email, slug)
        two_fa = ClienteAuthService._check_two_fa(cliente, slug)
        if two_fa:
            return two_fa

        tokens = generar_tokens_cliente(cliente)
        return {
            **tokens,
            'cliente': ClienteAuthService._datos_cliente(cliente),
        }

    @staticmethod
    def _datos_cliente(cliente) -> dict:
        return {
            'id':       str(cliente.id),
            'email':    cliente.email,
            'nombre':   cliente.nombre,
            'telefono': cliente.telefono,
        }
