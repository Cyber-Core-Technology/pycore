import logging
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.auth_module.repositories import UsuarioRepository
from apps.auth_module.exceptions import (
    CredencialesInvalidasException,
    UsuarioBloqueadoException,
    UsuarioInactivoException,
)
from apps.core.repositories import EmpresaRepository
from shared.two_fa_service import TwoFAService
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)

repo = UsuarioRepository()
empresa_repo = EmpresaRepository()


class AuthService:

    def login(self, email: str, password: str,
              ip_address: str = '', user_agent: str = '',
              trust_token: str = '') -> dict:
        usuario = repo.get_by_email(email)

        if not usuario:
            raise CredencialesInvalidasException()

        if not usuario.activo:
            raise UsuarioInactivoException()

        if usuario.esta_bloqueado():
            raise UsuarioBloqueadoException(
                detail=f'Usuario bloqueado hasta {usuario.bloqueado_hasta.strftime("%H:%M")}.'
            )

        if not usuario.check_password(password):
            repo.registrar_intento_fallido(usuario)
            raise CredencialesInvalidasException()

        repo.registrar_acceso_exitoso(usuario)

        if usuario.two_fa_enabled and usuario.two_fa_method:
            # Si hay trust token válido, omitir el desafío 2FA
            if trust_token and TwoFAService.verify_trust_token(trust_token, str(usuario.id), 'usuario'):
                pass  # caer al bloque de tokens reales abajo
            else:
                # El evento de login se registra al completar el 2FA, no aquí
                if usuario.two_fa_method == 'email':
                    sent = TwoFAService.send_email_otp(str(usuario.id), usuario.email, 'usuario')
                    if not sent:
                        raise CredencialesInvalidasException('No se pudo enviar el código de verificación.')
                temp_token = TwoFAService.generate_temp_token(
                    user_id=str(usuario.id),
                    user_type='usuario',
                    method=usuario.two_fa_method,
                    empresa_id=str(usuario.empresa.id_empresa) if usuario.empresa_id else '',
                )
                return {
                    'requires_2fa': True,
                    'two_fa_method': usuario.two_fa_method,
                    'temp_token': temp_token,
                }

        # Publicar evento de login exitoso
        try:
            event_bus.publish(DomainEvents.USUARIO_LOGIN, {
                'usuario_id':  str(usuario.id),
                'id_empresa':  str(usuario.empresa_id) if usuario.empresa_id else None,
                'usuario_email': usuario.email,
                'ip_address':  ip_address,
                'user_agent':  user_agent,
            })
        except Exception as e:
            logger.warning(f"[Auth] No se pudo publicar evento login: {e}")

        tokens = self._generar_tokens(usuario)
        return {
            **tokens,
            'usuario': self._datos_usuario(usuario),
        }

    def logout(self, refresh_token: str, usuario=None, ip_address: str = '') -> None:
        # Publicar el evento de logout primero (independiente del blacklist)
        if usuario and getattr(usuario, 'is_authenticated', False):
            try:
                event_bus.publish(DomainEvents.USUARIO_LOGOUT, {
                    'usuario_id':    str(usuario.id),
                    'id_empresa':    str(usuario.empresa_id) if getattr(usuario, 'empresa_id', None) else None,
                    'usuario_email': usuario.email,
                    'ip_address':    ip_address,
                })
            except Exception as e:
                logger.warning(f"[Auth] No se pudo publicar evento logout: {e}")

        # Blacklist del refresh token (falla silenciosamente si está vacío o expirado)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception as e:
                logger.warning(f"[Auth] No se pudo blacklistear token: {e}")

    def refresh(self, refresh_token: str) -> dict:
        try:
            token = RefreshToken(refresh_token)
            return {
                'access': str(token.access_token),
            }
        except Exception:
            from apps.auth_module.exceptions import TokenInvalidoException
            raise TokenInvalidoException()

    def _generar_tokens(self, usuario) -> dict:
        refresh = RefreshToken.for_user(usuario)
        refresh['empresa_id'] = str(usuario.empresa.id_empresa) if usuario.empresa_id else None
        refresh['username'] = usuario.username
        refresh['nombre'] = usuario.nombre_completo
        refresh['email'] = usuario.email
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

    def _datos_usuario(self, usuario) -> dict:
        roles = repo.get_roles_usuario(usuario)
        empresa_data = None
        if usuario.empresa:
            empresa_data = {
                'id': str(usuario.empresa.id_empresa),
                'nombre': usuario.empresa.nombre,
                'slug': usuario.empresa.slug,
                'plan': usuario.empresa.plan,
                'theme_key': usuario.empresa.theme_key or 'esmeralda',
            }

        sucursales_raw = repo.get_sucursales_usuario(usuario)
        sucursales_data = [
            {
                'id_sucursal':      str(s['sucursal__id_sucursal']),
                'nombre':           s['sucursal__nombre'],
                'codigo':           s['sucursal__codigo'],
                'es_principal':     s['sucursal__es_principal'],
                'es_predeterminada': s['es_predeterminada'],
            }
            for s in sucursales_raw
        ]

        return {
            'id': str(usuario.id),
            'email': usuario.email,
            'username': usuario.username,
            'nombre_completo': usuario.nombre_completo,
            'foto_url': usuario.foto_url,
            'is_staff': usuario.is_staff,
            'roles': roles,
            'empresa': empresa_data,
            'sucursales': sucursales_data,
        }