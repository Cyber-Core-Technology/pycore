import logging
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)


def publicar_compra_creada(compra, detalles: list) -> None:
    """
    Evento: compra.creada
    Consumidores: audit
    """
    event_bus.publish(DomainEvents.COMPRA_CREADA, {
        'compra_id': compra.id_compra,
        'folio': compra.folio,
        'id_empresa': compra.empresa_id,
        'id_sucursal': compra.sucursal_id,
        'id_proveedor': compra.proveedor_id,
        'total': float(compra.total),
        'items': [
            {
                'id_producto': d.producto_id,
                'cantidad': float(d.cantidad),
                'precio_unitario': float(d.precio_unitario),
            }
            for d in detalles
        ],
    })


def publicar_compra_recibida(compra, items_recibidos: list) -> None:
    """
    Evento: compra.recibida
    Consumidores:
        - inventory → entrada de mercancía + costo promedio ponderado
        - finance   → crea Cuenta Por Pagar
    """
    event_bus.publish(DomainEvents.COMPRA_RECIBIDA, {
        'compra_id': compra.id_compra,
        'folio': compra.folio,
        'id_empresa': compra.empresa_id,
        'id_sucursal': compra.sucursal_id,
        'id_proveedor': compra.proveedor_id,
        'total': float(compra.total),
        'items': items_recibidos,
    })


def publicar_compra_cancelada(compra) -> None:
    """
    Evento: compra.cancelada
    Consumidores: finance → cancela CxP si existía
    """
    event_bus.publish(DomainEvents.COMPRA_CANCELADA, {
        'compra_id': compra.id_compra,
        'folio': compra.folio,
        'id_empresa': compra.empresa_id,
    })
