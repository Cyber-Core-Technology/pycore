import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.sales.models import Devolucion, DetalleDevolucion
from apps.sales.repositories import DevolucionRepository, VentaRepository
from apps.sales.validators import VentaValidator
from apps.sales.exceptions import (
    VentaNotFoundException,
    DevolucionNotFoundException,
    DevolucionInvalidaException,
    SalesException,
)
from apps.sales.events import publicar_devolucion_creada

logger = logging.getLogger(__name__)


class DevolucionService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = DevolucionRepository()
        self.venta_repo = VentaRepository()

    def _generar_folio(self) -> str:
        prefijo = f"DEV-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.repo.get_ultimo_folio(self.empresa)
        if ultimo and ultimo.startswith(prefijo):
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    @transaction.atomic
    def crear_devolucion(self, id_venta: int, data: dict) -> Devolucion:
        """
        Flujo:
        1. Validar que la venta existe y está activa
        2. Validar ítems a devolver vs lo vendido
        3. Crear Devolucion y DetalleDevolucion
        4. Publicar devolucion.creada → inventory reintegra stock, finance ajusta CxC
        """
        venta = self.venta_repo.get_by_id(id_venta, self.empresa)
        if not venta:
            raise VentaNotFoundException()

        if venta.estado == 'cancelado':
            raise DevolucionInvalidaException(
                "No se puede hacer una devolución sobre una venta cancelada."
            )

        items = data.get('items', [])
        if not items:
            raise DevolucionInvalidaException(
                "La devolución debe incluir al menos un producto."
            )

        VentaValidator.validar_items_devolucion(venta, items)

        # Calcular totales de la devolución desde los detalles originales
        detalle_map = {d.id_detalle: d for d in venta.detalles.all()}
        detalles_objs = []
        subtotal = Decimal('0')
        impuestos = Decimal('0')

        for item in items:
            detalle_original = detalle_map[item['id_detalle_venta']]
            cantidad = Decimal(str(item['cantidad']))

            item_subtotal = detalle_original.precio_unitario * cantidad
            item_impuesto = (
                item_subtotal * (detalle_original.impuesto_tasa / 100)
                if detalle_original.impuesto_tasa else Decimal('0')
            )
            item_total = item_subtotal + item_impuesto

            subtotal += item_subtotal
            impuestos += item_impuesto

            detalles_objs.append(DetalleDevolucion(
                detalle_venta=detalle_original,
                producto_id=detalle_original.producto_id,
                variante_id=detalle_original.variante_id,
                cantidad=cantidad,
                precio_unitario=detalle_original.precio_unitario,
                subtotal=item_subtotal,
                impuesto_monto=item_impuesto,
                total=item_total,
            ))

        total = subtotal + impuestos

        devolucion = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            venta=venta,
            sucursal=venta.sucursal,
            motivo=data['motivo'],
            observaciones=data.get('observaciones', ''),
            subtotal=subtotal,
            impuestos=impuestos,
            total=total,
            metodo_reembolso=data.get('metodo_reembolso'),
            reembolsado=False,
            created_by=self.usuario,
        )

        for d in detalles_objs:
            d.devolucion = devolucion
        DetalleDevolucion.objects.bulk_create(detalles_objs)

        items_evento = [
            {
                'id_producto': str(d.producto_id),
                'id_variante': str(d.variante_id) if d.variante_id else None,
                'cantidad': float(d.cantidad),
            }
            for d in detalles_objs
        ]
        publicar_devolucion_creada(devolucion, items_evento)

        logger.info(f"✅ Devolución creada: {devolucion.folio} — ${devolucion.total}")
        return devolucion

    def obtener_devolucion(self, id_devolucion: int) -> Devolucion:
        dev = self.repo.get_by_id(id_devolucion, self.empresa)
        if not dev:
            raise DevolucionNotFoundException()
        return dev

    def listar_devoluciones(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)
