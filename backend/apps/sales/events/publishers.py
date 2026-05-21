import logging
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)


def publicar_venta_creada(venta, items: list) -> None:
    """
    Evento: venta.creada
    Consumidores:
        - inventory → descontar stock
        - finance   → crear CxC si metodo_pago == 'credito'
    """
    event_bus.publish(DomainEvents.VENTA_CREADA, {
        'venta_id': venta.id_venta,
        'folio': venta.folio,
        'id_empresa': str(venta.empresa_id),
        'id_sucursal': str(venta.sucursal_id),
        'id_cliente': str(venta.cliente_id) if venta.cliente_id else None,
        'total': float(venta.total),
        'metodo_pago': venta.metodo_pago,
        'items': items,
    })


def publicar_venta_cancelada(venta, motivo: str) -> None:
    """
    Evento: venta.cancelada
    Consumidores:
        - inventory → reintegrar stock
        - finance   → cancelar CxC si existía
    """
    event_bus.publish(DomainEvents.VENTA_CANCELADA, {
        'venta_id': venta.id_venta,
        'folio': venta.folio,
        'id_empresa': str(venta.empresa_id),
        'id_sucursal': str(venta.sucursal_id),
        'motivo': motivo,
    })


def publicar_venta_pagada(venta) -> None:
    """
    Evento: venta.pagada
    Consumidores: audit
    """
    event_bus.publish(DomainEvents.VENTA_PAGADA, {
        'venta_id': venta.id_venta,
        'folio': venta.folio,
        'id_empresa': str(venta.empresa_id),
        'id_sucursal': str(venta.sucursal_id),
        'total': float(venta.total),
        'metodo_pago': venta.metodo_pago,
    })


def publicar_devolucion_creada(devolucion, items: list) -> None:
    """
    Evento: devolucion.creada
    Consumidores:
        - inventory → reintegrar stock
        - finance   → ajustar CxC (nota de crédito)
    """
    event_bus.publish(DomainEvents.DEVOLUCION_CREADA, {
        'devolucion_id': devolucion.id_devolucion,
        'folio': devolucion.folio,
        'venta_id': devolucion.venta_id,
        'id_empresa': str(devolucion.empresa_id),
        'total': float(devolucion.total),
        'items': items,
    })
