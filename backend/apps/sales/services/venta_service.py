import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.sales.models import Venta, DetalleVenta
from apps.sales.repositories import VentaRepository
from apps.sales.validators import VentaValidator
from apps.sales.exceptions import (
    VentaNotFoundException,
    VentaInvalidStateException,
    VentaFacturadaException,
    SalesException,
)
from apps.sales.events import publicar_venta_creada, publicar_venta_cancelada, publicar_venta_pagada

logger = logging.getLogger(__name__)


def _evaluar_insignias_venta(venta):
    try:
        from apps.tezca.services.insignia_service import InsigniaService
        InsigniaService.evaluar_venta(venta)
    except Exception as exc:
        logger.warning(f'[InsigniaService] evaluar_venta falló silenciosamente: {exc}')


class VentaService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = VentaRepository()

    def _get_cliente(self, uuid):
        if not uuid:
            return None
        from apps.terceros.models import Cliente
        try:
            return Cliente.objects.get(id=uuid, empresa=self.empresa)
        except Cliente.DoesNotExist:
            raise SalesException(f"Cliente {uuid} no encontrado.")

    def _get_sucursal(self, uuid):
        from apps.core.models import Sucursal
        try:
            return Sucursal.objects.get(id_sucursal=uuid, empresa=self.empresa)
        except Sucursal.DoesNotExist:
            raise SalesException(f"Sucursal {uuid} no encontrada.")

    def _get_producto(self, uuid):
        from apps.inventory.models import Producto
        try:
            return Producto.objects.get(id=uuid)
        except Producto.DoesNotExist:
            raise SalesException(f"Producto {uuid} no encontrado.")

    def _get_variante(self, producto, variante_id):
        if not variante_id:
            return None
        from apps.inventory.models import VarianteProducto
        try:
            return VarianteProducto.objects.get(id=variante_id, producto=producto)
        except VarianteProducto.DoesNotExist:
            raise SalesException(f"Variante {variante_id} no encontrada para el producto.")

    def _get_costo_unitario(self, producto, sucursal, variante=None):
        from apps.inventory.models import Inventario
        try:
            inv = Inventario.objects.get(
                producto=producto,
                sucursal=sucursal,
                empresa=self.empresa,
                variante=variante,
            )
            return inv.costo_promedio or Decimal('0')
        except Inventario.DoesNotExist:
            return Decimal('0')

    def _generar_folio(self) -> str:
        prefijo = f"VEN-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.repo.get_ultimo_folio_prefijo(self.empresa, prefijo)
        if ultimo:
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    def _calcular_detalle(self, item: dict, producto, variante=None) -> dict:
        cantidad = Decimal(str(item['cantidad']))
        precio_base = variante.precio_venta_efectivo if variante else producto.precio_venta
        precio_unitario = Decimal(str(item.get('precio_unitario') or precio_base))
        descuento = Decimal(str(item.get('descuento', 0)))
        impuesto_tasa = None

        if producto.impuesto and producto.impuesto.activo:
            impuesto_tasa = Decimal(str(producto.impuesto.tasa))
        elif item.get('impuesto_tasa'):
            impuesto_tasa = Decimal(str(item['impuesto_tasa']))

        subtotal = (precio_unitario * cantidad) - descuento
        impuesto_monto = (
            subtotal * (impuesto_tasa / 100) if impuesto_tasa else Decimal('0')
        )
        total = subtotal + impuesto_monto

        return {
            'cantidad': cantidad,
            'precio_unitario': precio_unitario,
            'descuento': descuento,
            'subtotal': subtotal,
            'impuesto_tasa': impuesto_tasa,
            'impuesto_monto': impuesto_monto,
            'total': total,
        }

    def _calcular_descuento_promocion(self, promocion, subtotal: Decimal) -> Decimal:
        if not promocion:
            return Decimal('0')
        if promocion.tipo_descuento == 'porcentaje':
            return subtotal * (promocion.descuento / 100)
        return min(promocion.descuento, subtotal)

    def _calcular_totales(self, detalles, descuento_promocion=Decimal('0')) -> dict:
        subtotal = sum(d.subtotal for d in detalles)
        impuestos = sum(d.impuesto_monto for d in detalles)
        descuento_total = sum(d.descuento for d in detalles) + descuento_promocion
        total = subtotal + impuestos - descuento_promocion
        return {
            'subtotal': subtotal,
            'descuento': descuento_total,
            'impuestos': impuestos,
            'total': max(total, Decimal('0')),
        }

    @transaction.atomic
    def crear_venta(self, data: dict) -> Venta:
        items = data.get('items', [])
        if not items:
            raise SalesException("La venta debe tener al menos un producto.")

        cliente = self._get_cliente(data.get('id_cliente'))
        sucursal = self._get_sucursal(data['id_sucursal'])

        VentaValidator.validar_items(items, sucursal, self.empresa)

        promocion = None
        if data.get('id_promocion'):
            from apps.sales.repositories import PromocionRepository
            promocion = PromocionRepository().get_by_id(
                data['id_promocion'], self.empresa
            )
            if not promocion:
                raise SalesException(f"Promoción {data['id_promocion']} no encontrada.")

        detalles_data = []
        for item in items:
            producto = self._get_producto(item['id_producto'])
            variante = self._get_variante(producto, item.get('id_variante'))
            calc = self._calcular_detalle(item, producto, variante)
            costo_unitario = self._get_costo_unitario(producto, sucursal, variante)
            detalles_data.append({
                'producto': producto,
                'variante': variante,
                'calc': calc,
                'costo_unitario': costo_unitario,
                'costo_total': costo_unitario * calc['cantidad'],
                'notas': item.get('notas', ''),
            })

        subtotal_provisional = sum(d['calc']['subtotal'] for d in detalles_data)

        if data.get('metodo_pago') == 'credito':
            if not cliente:
                raise SalesException("Las ventas a crédito requieren un cliente registrado.")
            VentaValidator.validar_credito_cliente(cliente, subtotal_provisional)

        if promocion:
            VentaValidator.validar_promocion(promocion, subtotal_provisional)

        descuento_promocion = self._calcular_descuento_promocion(
            promocion, subtotal_provisional
        )

        detalles_objs = []
        for d in detalles_data:
            detalles_objs.append(DetalleVenta(
                producto=d['producto'],
                variante=d['variante'],
                cantidad=d['calc']['cantidad'],
                precio_unitario=d['calc']['precio_unitario'],
                descuento=d['calc']['descuento'],
                subtotal=d['calc']['subtotal'],
                impuesto_tasa=d['calc']['impuesto_tasa'],
                impuesto_monto=d['calc']['impuesto_monto'],
                total=d['calc']['total'],
                costo_unitario=d['costo_unitario'],
                costo_total=d['costo_total'],
                notas=d.get('notas', ''),
            ))

        totales = self._calcular_totales(detalles_objs, descuento_promocion)

        fecha_vencimiento = None
        if data.get('metodo_pago') == 'credito' and cliente:
            from datetime import timedelta
            fecha_vencimiento = (
                timezone.now().date() +
                timedelta(days=cliente.dias_credito or 30)
            )

        monto_recibido = None
        cambio = None
        if data.get('metodo_pago') == 'efectivo' and data.get('monto_recibido') is not None:
            monto_recibido = Decimal(str(data['monto_recibido']))
            cambio = max(monto_recibido - totales['total'], Decimal('0'))

        venta = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            cliente=cliente,
            sucursal=sucursal,
            vendedor=self.usuario,
            promocion=promocion,
            estado='activo',
            metodo_pago=data['metodo_pago'],
            fecha_vencimiento=fecha_vencimiento,
            subtotal=totales['subtotal'],
            descuento=totales['descuento'],
            impuestos=totales['impuestos'],
            total=totales['total'],
            monto_recibido=monto_recibido,
            cambio=cambio,
            saldo_pendiente=totales['total'] if data.get('metodo_pago') == 'credito' else Decimal('0'),
            requiere_factura=data.get('requiere_factura', False),
            notas=data.get('notas', ''),
            created_by=self.usuario,
        )

        for d in detalles_objs:
            d.venta = venta
        DetalleVenta.objects.bulk_create(detalles_objs)

        if promocion:
            promocion.cantidad_usado += 1
            promocion.save(update_fields=['cantidad_usado'])

        # Preparar payload antes del commit
        items_evento = [
            {
                'id_producto': str(d.producto_id),
                'id_variante': str(d.variante.id) if d.variante else None,
                'cantidad': float(d.cantidad),
                'precio_unitario': float(d.precio_unitario),
                'costo_unitario': float(d.costo_unitario or 0),
            }
            for d in detalles_objs
        ]

        # Publicar evento FUERA de la transacción — on_commit garantiza
        # que la venta ya está guardada antes de que los handlers corran.
        # Un fallo en los handlers (inventory, audit) no revierte la venta.
        venta_ref = venta
        transaction.on_commit(lambda: publicar_venta_creada(venta_ref, items_evento))
        if data.get('metodo_pago') != 'credito':
            transaction.on_commit(lambda: publicar_venta_pagada(venta_ref))
        transaction.on_commit(lambda: _evaluar_insignias_venta(venta_ref))

        logger.info(f"✅ Venta creada: {venta.folio} — ${venta.total}")
        return venta

    def obtener_venta(self, id_venta: int) -> Venta:
        venta = self.repo.get_by_id(id_venta, self.empresa)
        if not venta:
            raise VentaNotFoundException()
        return venta

    def listar_ventas(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    @transaction.atomic
    def cancelar_venta(self, id_venta: int, motivo: str = '') -> Venta:
        venta = self.obtener_venta(id_venta)

        if not venta.puede_cancelarse():
            if venta.facturado:
                raise VentaFacturadaException()
            raise VentaInvalidStateException(
                f"La venta {venta.folio} no puede cancelarse desde '{venta.estado}'."
            )

        venta.estado = 'cancelado'
        if motivo:
            venta.notas = f"{venta.notas}\n[CANCELACIÓN] {motivo}".strip()
        venta.updated_by = self.usuario
        self.repo.save(venta)

        transaction.on_commit(lambda: publicar_venta_cancelada(venta, motivo))

        logger.info(f"✅ Venta cancelada: {venta.folio}")
        return venta
