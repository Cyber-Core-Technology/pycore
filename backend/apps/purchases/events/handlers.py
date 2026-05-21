import logging
from shared.events import event_bus, DomainEvents, BaseEventHandler

logger = logging.getLogger(__name__)


def setup_purchases_event_handlers():
    """
    Purchases no escucha eventos externos.
    Solo publica: compra.creada, compra.recibida, compra.cancelada
    """
    logger.info("✅ Purchases event handlers configurados")
