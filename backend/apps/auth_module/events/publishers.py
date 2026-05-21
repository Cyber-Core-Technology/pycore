import logging
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)


def publicar_usuario_creado(usuario, id_empresa=None) -> None:
    try:
        event_bus.publish(DomainEvents.USUARIO_CREADO, {
            'usuario_id':    str(usuario.id),
            'usuario_email': usuario.email,
            'id_empresa':    str(id_empresa or usuario.empresa_id or ''),
        })
    except Exception as e:
        logger.warning(f"[Auth] No se pudo publicar evento usuario.creado: {e}")


def publicar_usuario_bloqueado(usuario) -> None:
    try:
        event_bus.publish(DomainEvents.USUARIO_BLOQUEADO, {
            'usuario_id':    str(usuario.id),
            'usuario_email': usuario.email,
            'id_empresa':    str(usuario.empresa_id or ''),
            'bloqueado_hasta': str(usuario.bloqueado_hasta) if usuario.bloqueado_hasta else '',
        })
    except Exception as e:
        logger.warning(f"[Auth] No se pudo publicar evento usuario.bloqueado: {e}")
