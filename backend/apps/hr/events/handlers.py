import logging

logger = logging.getLogger(__name__)


def setup_hr_event_handlers():
    """
    HR no escucha eventos externos en esta fase.
    Solo publica: colaborador.creado, asistencia.registrada
    """
    logger.info("✅ HR event handlers configurados")
