import logging
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)


def publicar_colaborador_creado(colaborador) -> None:
    try:
        event_bus.publish(DomainEvents.COLABORADOR_CREADO, {
            'colaborador_id': colaborador.pk,
            'numero_empleado': colaborador.numero_empleado,
            'id_empresa': colaborador.empresa_id,
        })
    except Exception as e:
        logger.warning(f"[HR] No se pudo publicar evento colaborador.creado: {e}")


def publicar_asistencia_registrada(asistencia) -> None:
    try:
        event_bus.publish(DomainEvents.ASISTENCIA_REGISTRADA, {
            'asistencia_id': asistencia.pk,
            'id_empresa': asistencia.empresa_id,
            'colaborador_id': asistencia.colaborador_id,
            'tipo': asistencia.tipo,
            'fecha': str(asistencia.fecha),
        })
    except Exception as e:
        logger.warning(f"[HR] No se pudo publicar evento asistencia.registrada: {e}")
