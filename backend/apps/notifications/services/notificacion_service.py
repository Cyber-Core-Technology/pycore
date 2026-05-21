# apps/notifications/services/notificacion_service.py
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.notifications.models import Notificacion
from apps.notifications.serializers import NotificacionSerializer

logger = logging.getLogger(__name__)


def _safe_group(prefix: str, uid) -> str:
    return f"{prefix}_{str(uid).replace('-', '_')}"[:100]


class NotificacionService:

    @staticmethod
    def crear(
        empresa,
        destinatario,
        tipo: str,
        titulo: str,
        mensaje: str,
        icono: str = 'bell',
        remitente=None,
        metadata: dict | None = None,
    ) -> Notificacion:
        notif = Notificacion.objects.create(
            empresa=empresa,
            destinatario=destinatario,
            remitente=remitente,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            icono=icono,
            metadata=metadata or {},
        )

        # Push en tiempo real al canal personal del usuario (WebSocket)
        try:
            channel_layer = get_channel_layer()
            group = _safe_group('usuario', destinatario.pk)
            payload = NotificacionSerializer(notif).data
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type': 'domain_event',
                    'event': 'notificacion.nueva',
                    'payload': payload,
                },
            )
        except Exception as exc:
            logger.warning(f'[Notificaciones] WS push falló: {exc}')

        # Web Push (dispositivo bloqueado / app cerrada)
        try:
            from apps.notifications.services.push_service import PushService
            PushService.send_to_user(
                usuario=destinatario,
                title=notif.titulo,
                body=notif.mensaje,
                data={'notif_id': str(notif.id), 'url': '/dashboard'},
                icon=None,
            )
        except Exception as exc:
            logger.warning(f'[Notificaciones] Web push falló: {exc}')

        return notif

    @staticmethod
    def _resolver_variables(texto: str, destinatario, remitente, empresa) -> str:
        """Reemplaza variables dinámicas {usuario}, {fecha}, etc. por sus valores reales."""
        from django.utils import timezone
        now   = timezone.localtime()
        fecha = now.strftime('%-d de %B de %Y') if hasattr(now, 'strftime') else str(now.date())
        hora  = now.strftime('%H:%M')
        return (
            texto
            .replace('{usuario}',   destinatario.nombre_completo or destinatario.username)
            .replace('{empresa}',   empresa.nombre or '')
            .replace('{fecha}',     fecha)
            .replace('{hora}',      hora)
            .replace('{remitente}', remitente.nombre_completo or remitente.username)
        )

    @staticmethod
    def broadcast(empresa, remitente, titulo: str, mensaje: str, rol_slug: str = '') -> int:
        """
        Envía una notificación personalizada a todos los usuarios activos de la empresa.
        Si rol_slug está definido, filtra solo usuarios con ese rol.
        Las variables {usuario}, {fecha}, etc. se resuelven por destinatario.
        Devuelve el número de notificaciones creadas.
        """
        from apps.auth_module.models import Usuario

        qs = Usuario.objects.filter(empresa=empresa, activo=True).exclude(pk=remitente.pk)

        if rol_slug:
            qs = qs.filter(usuario_roles__rol__slug=rol_slug)

        count = 0
        for usuario in qs.distinct():
            titulo_resuelto  = NotificacionService._resolver_variables(titulo,  usuario, remitente, empresa)
            mensaje_resuelto = NotificacionService._resolver_variables(mensaje, usuario, remitente, empresa)
            NotificacionService.crear(
                empresa=empresa,
                destinatario=usuario,
                tipo=Notificacion.Tipo.ADMIN_MENSAJE,
                titulo=titulo_resuelto,
                mensaje=mensaje_resuelto,
                icono='megaphone',
                remitente=remitente,
            )
            count += 1

        return count
