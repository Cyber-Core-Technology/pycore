import logging
from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)


def publicar_cxc_creada(cxc) -> None:
    event_bus.publish(DomainEvents.CUENTA_COBRAR_CREADA, {
        'cxc_id': cxc.pk,
        'folio': cxc.folio,
        'id_empresa': cxc.empresa_id,
        'id_cliente': cxc.cliente_id,
        'monto_original': float(cxc.monto_original),
        'fecha_vencimiento': str(cxc.fecha_vencimiento),
    })


def publicar_cxc_cancelada(cxc) -> None:
    event_bus.publish(DomainEvents.CUENTA_COBRAR_CANCELADA, {
        'cxc_id': cxc.id_cxc,
        'folio': cxc.folio,
        'id_empresa': cxc.empresa_id,
        'id_cliente': cxc.cliente_id,
    })


def publicar_cxp_creada(cxp) -> None:
    event_bus.publish(DomainEvents.CUENTA_PAGAR_CREADA, {
        'cxp_id': cxp.pk,
        'folio': cxp.folio,
        'id_empresa': cxp.empresa_id,
        'id_proveedor': cxp.proveedor_id,
        'monto_original': float(cxp.monto_original),
        'fecha_vencimiento': str(cxp.fecha_vencimiento),
    })


def publicar_cxp_cancelada(cxp) -> None:
    event_bus.publish(DomainEvents.CUENTA_PAGAR_CANCELADA, {
        'cxp_id': cxp.id_cxp,
        'folio': cxp.folio,
        'id_empresa': cxp.empresa_id,
        'id_proveedor': cxp.proveedor_id,
    })


def publicar_pago_cliente_registrado(pago, cxc) -> None:
    event_bus.publish(DomainEvents.PAGO_REGISTRADO, {
        'pago_id': pago.pk,
        'folio': pago.folio,
        'id_empresa': pago.empresa_id,
        'cxc_id': cxc.pk,
        'monto': float(pago.monto),
        'saldo_pendiente': float(cxc.saldo_pendiente),
    })


def publicar_pago_proveedor_registrado(pago, cxp) -> None:
    event_bus.publish(DomainEvents.PAGO_REGISTRADO, {
        'pago_id': pago.pk,
        'folio': pago.folio,
        'id_empresa': pago.empresa_id,
        'cxp_id': cxp.pk,
        'monto': float(pago.monto),
        'saldo_pendiente': float(cxp.saldo_pendiente),
    })


def publicar_cxc_pagada(cxc) -> None:
    event_bus.publish(DomainEvents.CUENTA_COBRAR_PAGADA, {
        'cxc_id': cxc.pk,
        'folio': cxc.folio,
        'id_empresa': cxc.empresa_id,
        'id_cliente': cxc.cliente_id,
        'monto_original': float(cxc.monto_original),
    })


def publicar_cxp_pagada(cxp) -> None:
    event_bus.publish(DomainEvents.CUENTA_PAGAR_PAGADA, {
        'cxp_id': cxp.pk,
        'folio': cxp.folio,
        'id_empresa': cxp.empresa_id,
        'id_proveedor': cxp.proveedor_id,
        'monto_original': float(cxp.monto_original),
    })
