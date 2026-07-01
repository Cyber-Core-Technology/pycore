import logging
from shared.events import event_bus, DomainEvents, BaseEventHandler
from shared.request_context import get_request_context, mark_audited
from apps.audit.services import AuditService

logger = logging.getLogger(__name__)

audit_service = AuditService()


class AuditEventHandler(BaseEventHandler):
    def __init__(self, accion: str, tabla: str = '', id_field: str = ''):
        self.accion  = accion
        self.tabla   = tabla
        self.id_field = id_field

    def process(self, payload: dict) -> None:
        ctx = get_request_context()

        # Enriquecer con datos del request cuando el publisher no los incluyó
        id_usuario    = payload.get('usuario_id')    or ctx.get('user_id')     or None
        usuario_email = (payload.get('usuario_email') or payload.get('email')
                         or ctx.get('user_email')     or '')
        ip_address    = payload.get('ip_address')    or ctx.get('ip_address')  or None

        audit_service.registrar(
            accion=self.accion,
            payload=payload,
            id_empresa=payload.get('id_empresa'),
            id_usuario=id_usuario,
            usuario_email=usuario_email,
            tabla=self.tabla,
            id_registro=payload.get(self.id_field, ''),
            ip_address=ip_address,
        )
        # Evita que el middleware genérico duplique esta misma request
        mark_audited()
        logger.debug(f"[Audit] ✅ Log registrado: {self.accion}")


def setup_audit_event_handlers():
    eventos = [
        (DomainEvents.VENTA_CREADA,          'Ventas',           'venta_id'),
        (DomainEvents.VENTA_CANCELADA,       'Ventas',           'venta_id'),
        (DomainEvents.VENTA_PAGADA,          'Ventas',           'venta_id'),
        (DomainEvents.DEVOLUCION_CREADA,     'Devoluciones',     'devolucion_id'),
        (DomainEvents.COMPRA_CREADA,         'Compras',          'compra_id'),
        (DomainEvents.COMPRA_RECIBIDA,       'Compras',          'compra_id'),
        (DomainEvents.COMPRA_CANCELADA,      'Compras',          'compra_id'),
        (DomainEvents.STOCK_BAJO,            'Inventario',       'inventario_id'),
        (DomainEvents.MOVIMIENTO_CREADO,     'Movimientos',      'movimiento_id'),
        (DomainEvents.PRODUCTO_CREADO,       'Productos',        'producto_id'),
        (DomainEvents.PRODUCTO_ACTUALIZADO,  'Productos',        'producto_id'),
        (DomainEvents.CUENTA_COBRAR_CREADA,  'CuentasPorCobrar', 'cxc_id'),
        (DomainEvents.CUENTA_COBRAR_PAGADA,  'CuentasPorCobrar', 'cxc_id'),
        (DomainEvents.CUENTA_COBRAR_CANCELADA, 'CuentasPorCobrar', 'cxc_id'),
        (DomainEvents.CUENTA_COBRAR_VENCIDA, 'CuentasPorCobrar', 'cxc_id'),
        (DomainEvents.CUENTA_PAGAR_CREADA,   'CuentasPorPagar',  'cxp_id'),
        (DomainEvents.CUENTA_PAGAR_PAGADA,   'CuentasPorPagar',  'cxp_id'),
        (DomainEvents.CUENTA_PAGAR_CANCELADA, 'CuentasPorPagar', 'cxp_id'),
        (DomainEvents.PAGO_REGISTRADO,       'Pagos',            'pago_id'),
        (DomainEvents.GASTO_REGISTRADO,      'Gastos',           'gasto_id'),
        (DomainEvents.USUARIO_CREADO,        'Usuarios',         'usuario_id'),
        (DomainEvents.USUARIO_LOGIN,         'Usuarios',         'usuario_id'),
        (DomainEvents.USUARIO_LOGOUT,        'Usuarios',         'usuario_id'),
        (DomainEvents.USUARIO_BLOQUEADO,     'Usuarios',         'usuario_id'),
        (DomainEvents.COLABORADOR_CREADO,    'Colaboradores',    'colaborador_id'),
        (DomainEvents.ASISTENCIA_REGISTRADA, 'Asistencias',      'asistencia_id'),
    ]

    for evento, tabla, id_field in eventos:
        event_bus.subscribe(
            evento,
            AuditEventHandler(accion=evento, tabla=tabla, id_field=id_field).handle
        )

    logger.info(f"✅ Audit event handlers configurados ({len(eventos)} eventos)")
