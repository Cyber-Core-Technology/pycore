import logging
from shared.events import event_bus, DomainEvents, BaseEventHandler

logger = logging.getLogger(__name__)


def setup_sales_event_handlers():
    """
    Sales no escucha eventos externos en esta fase.
    Solo publica: venta.creada, venta.cancelada, devolucion.creada
    """
    logger.info("✅ Sales event handlers configurados")
