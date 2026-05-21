import logging
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)


def publicar_stock_bajo(inventario) -> None:
    """
    Evento: stock.bajo
    Consumidores: notifications → alerta a gerente de sucursal
    """
    event_bus.publish(DomainEvents.STOCK_BAJO, {
        'inventario_id': inventario.id_inventario,
        'id_empresa': inventario.empresa_id,
        'id_producto': inventario.producto_id,
        'id_sucursal': inventario.sucursal_id,
        'stock_actual': float(inventario.stock_actual),
        'stock_minimo': float(inventario.producto.stock_minimo),
    })


def publicar_movimiento_creado(movimiento) -> None:
    """
    Evento: movimiento.creado
    Consumidores: audit
    """
    event_bus.publish(DomainEvents.MOVIMIENTO_CREADO, {
        'movimiento_id': movimiento.id_movimiento,
        'folio': movimiento.folio,
        'id_empresa': movimiento.empresa_id,
        'tipo_movimiento': movimiento.tipo_movimiento,
        'id_producto': movimiento.producto_id,
        'cantidad': float(movimiento.cantidad),
        'stock_despues': float(movimiento.stock_despues),
    })
