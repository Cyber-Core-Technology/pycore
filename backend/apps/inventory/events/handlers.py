import logging
from shared.events import event_bus, DomainEvents, BaseEventHandler

logger = logging.getLogger(__name__)


class OnVentaCreadaHandler(BaseEventHandler):
    """
    Escucha: venta.creada
    Acción: Registra salida de stock por cada item de la venta.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa, Sucursal
        from apps.inventory.models import Producto
        from apps.inventory.services.movimiento_service import MovimientoService

        empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
        sucursal = Sucursal.objects.get(id_sucursal=payload['id_sucursal'])
        service = MovimientoService()

        for item in payload.get('items', []):
            try:
                producto = Producto.objects.get(id=item["id_producto"], empresa=empresa)
                if not producto.maneja_inventario:
                    continue
                variante = None
                if item.get('id_variante'):
                    from apps.inventory.models import VarianteProducto
                    try:
                        variante = VarianteProducto.objects.get(id=item['id_variante'])
                    except VarianteProducto.DoesNotExist:
                        pass
                service.registrar_salida(
                    empresa=empresa,
                    sucursal=sucursal,
                    producto=producto,
                    cantidad=item['cantidad'],
                    variante=variante,
                    tipo_referencia='venta',
                    referencia_id=payload['venta_id'],
                    motivo=f"Venta {payload['folio']}",
                )
                logger.info(
                    f"[Inventory] ✅ Salida registrada — "
                    f"producto={item['id_producto']} cantidad={item['cantidad']} "
                    f"venta={payload['folio']}"
                )
            except Exception as e:
                logger.error(
                    f"[Inventory] ❌ Error registrando salida producto={item.get('id_producto')}: {e}",
                    exc_info=True
                )
                raise


class OnVentaCanceladaHandler(BaseEventHandler):
    """
    Escucha: venta.cancelada
    Acción: Reintegra stock de los items de la venta cancelada.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa, Sucursal
        from apps.sales.models import Venta
        from apps.inventory.models import Producto
        from apps.inventory.services.movimiento_service import MovimientoService

        empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
        sucursal = Sucursal.objects.get(id_sucursal=payload['id_sucursal'])
        service = MovimientoService()

        # Obtenemos los items desde la venta directamente
        venta = Venta.objects.prefetch_related('detalles').get(
            id=payload['venta_id'], empresa=empresa
        )

        for detalle in venta.detalles.select_related('variante').all():
            try:
                producto = detalle.producto
                if not producto.maneja_inventario:
                    continue
                service.registrar_entrada(
                    empresa=empresa,
                    sucursal=sucursal,
                    producto=producto,
                    cantidad=detalle.cantidad,
                    costo_unitario=float(producto.precio_compra or 0),
                    variante=detalle.variante,
                    tipo_referencia='devolucion_venta',
                    referencia_id=payload['venta_id'],
                    motivo=f"Cancelación venta {payload['folio']}",
                )
                logger.info(
                    f"[Inventory] ✅ Stock reintegrado — "
                    f"producto={producto.id} cantidad={detalle.cantidad} "
                    f"venta cancelada={payload['folio']}"
                )
            except Exception as e:
                logger.error(
                    f"[Inventory] ❌ Error reintegrando stock producto={detalle.producto_id}: {e}",
                    exc_info=True
                )
                raise


class OnCompraRecibidaHandler(BaseEventHandler):
    """
    Escucha: compra.recibida
    Acción: Registra entrada de mercancía + actualiza costo promedio ponderado.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa, Sucursal
        from apps.inventory.models import Producto
        from apps.inventory.services.movimiento_service import MovimientoService

        empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
        sucursal = Sucursal.objects.get(id_sucursal=payload['id_sucursal'])
        service = MovimientoService()

        for item in payload.get('items', []):
            try:
                producto = Producto.objects.get(id=item["id_producto"], empresa=empresa)
                variante = None
                if item.get('id_variante'):
                    from apps.inventory.models import VarianteProducto
                    try:
                        variante = VarianteProducto.objects.get(id=item['id_variante'])
                    except VarianteProducto.DoesNotExist:
                        pass
                service.registrar_entrada(
                    empresa=empresa,
                    sucursal=sucursal,
                    producto=producto,
                    cantidad=item['cantidad_recibida'],
                    costo_unitario=float(item.get('precio_unitario', 0)),
                    variante=variante,
                    tipo_referencia='compra',
                    referencia_id=payload['compra_id'],
                    motivo=f"Compra {payload['folio']}",
                )
                logger.info(
                    f"[Inventory] ✅ Entrada registrada — "
                    f"producto={item['id_producto']} cantidad={item['cantidad_recibida']} "
                    f"compra={payload['folio']}"
                )
            except Exception as e:
                logger.error(
                    f"[Inventory] ❌ Error registrando entrada producto={item.get('id_producto')}: {e}",
                    exc_info=True
                )
                raise


class OnDevolucionCreadaHandler(BaseEventHandler):
    """
    Escucha: devolucion.creada
    Acción: Reintegra stock de los productos devueltos.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa
        from apps.sales.models import Venta
        from apps.inventory.models import Producto
        from apps.inventory.services.movimiento_service import MovimientoService

        empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
        venta = Venta.objects.get(id=payload['venta_id'], empresa=empresa)
        service = MovimientoService()

        for item in payload.get('items', []):
            try:
                producto = Producto.objects.get(id=item["id_producto"], empresa=empresa)
                if not producto.maneja_inventario:
                    continue
                variante = None
                if item.get('id_variante'):
                    from apps.inventory.models import VarianteProducto
                    try:
                        variante = VarianteProducto.objects.get(id=item['id_variante'])
                    except VarianteProducto.DoesNotExist:
                        pass
                service.registrar_entrada(
                    empresa=empresa,
                    sucursal=venta.sucursal,
                    producto=producto,
                    cantidad=item['cantidad'],
                    costo_unitario=float(producto.precio_compra or 0),
                    variante=variante,
                    tipo_referencia='devolucion',
                    referencia_id=payload['devolucion_id'],
                    motivo=f"Devolución {payload['folio']}",
                )
                logger.info(
                    f"[Inventory] ✅ Stock reintegrado por devolución — "
                    f"producto={item['id_producto']} cantidad={item['cantidad']} "
                    f"devolucion={payload['folio']}"
                )
            except Exception as e:
                logger.error(
                    f"[Inventory] ❌ Error reintegrando stock devolución producto={item.get('id_producto')}: {e}",
                    exc_info=True
                )
                raise


def setup_inventory_event_handlers():
    """Registra todos los handlers de inventory en el event bus."""
    event_bus.subscribe(DomainEvents.VENTA_CREADA,     OnVentaCreadaHandler().handle)
    event_bus.subscribe(DomainEvents.VENTA_CANCELADA,  OnVentaCanceladaHandler().handle)
    event_bus.subscribe(DomainEvents.COMPRA_RECIBIDA,  OnCompraRecibidaHandler().handle)
    event_bus.subscribe(DomainEvents.DEVOLUCION_CREADA, OnDevolucionCreadaHandler().handle)
    logger.info("✅ Inventory event handlers configurados")
