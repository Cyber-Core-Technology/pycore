import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.purchases.models import Compra, DetalleCompra
from apps.purchases.repositories import CompraRepository, DetalleCompraRepository
from apps.purchases.validators import CompraValidator
from apps.purchases.exceptions import (
    CompraNotFoundException,
    CompraInvalidStateException,
    CompraEmptyDetallesException,
    PurchasesException,
)
from apps.purchases.events import (
    publicar_compra_creada,
    publicar_compra_recibida,
    publicar_compra_cancelada,
)



def _evaluar_insignias_compra(compra):
    try:
        from apps.tezca.services.insignia_service import InsigniaService
        InsigniaService.evaluar_compra(compra)
    except Exception as exc:
        logger.warning(f'[InsigniaService] evaluar_compra falló silenciosamente: {exc}')

logger = logging.getLogger(__name__)


class CompraService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.compra_repo = CompraRepository()
        self.detalle_repo = DetalleCompraRepository()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_proveedor(self, uuid):
        from apps.terceros.models import Proveedor
        try:
            return Proveedor.objects.get(id=uuid, empresa=self.empresa)
        except Proveedor.DoesNotExist:
            raise PurchasesException(f"Proveedor {uuid} no encontrado.")

    def _get_sucursal(self, uuid):
        from apps.core.models import Sucursal
        try:
            return Sucursal.objects.get(id_sucursal=uuid, empresa=self.empresa)
        except Sucursal.DoesNotExist:
            raise PurchasesException(f"Sucursal {uuid} no encontrada.")

    def _get_producto(self, uuid):
        from apps.inventory.models import Producto
        try:
            return Producto.objects.get(id=uuid)
        except Producto.DoesNotExist:
            raise PurchasesException(f"Producto {uuid} no encontrado.")

    # ── Folios ────────────────────────────────────────────────────────────────

    def _generar_folio(self) -> str:
        prefijo = f"CMP-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.compra_repo.get_ultimo_folio(self.empresa)
        if ultimo and ultimo.startswith(prefijo):
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    # ── Cálculos ──────────────────────────────────────────────────────────────

    def _calcular_detalle(self, item: dict) -> dict:
        cantidad = Decimal(str(item['cantidad']))
        precio_unitario = Decimal(str(item['precio_unitario']))
        descuento = Decimal(str(item.get('descuento', 0)))
        impuesto_tasa = (
            Decimal(str(item['impuesto_tasa']))
            if item.get('impuesto_tasa') else None
        )
        subtotal = (precio_unitario * cantidad) - descuento
        impuesto_monto = (
            subtotal * (impuesto_tasa / 100) if impuesto_tasa else Decimal('0')
        )
        return {
            'cantidad': cantidad,
            'precio_unitario': precio_unitario,
            'descuento': descuento,
            'subtotal': subtotal,
            'impuesto_tasa': impuesto_tasa,
            'impuesto_monto': impuesto_monto,
            'total': subtotal + impuesto_monto,
        }

    def _calcular_totales_compra(self, detalles) -> dict:
        subtotal = sum(d.subtotal for d in detalles)
        impuestos = sum(d.impuesto_monto for d in detalles)
        descuento = sum(d.descuento for d in detalles)
        return {
            'subtotal': subtotal,
            'descuento': descuento,
            'impuestos': impuestos,
            'total': subtotal + impuestos,
        }

    def _build_detalles(self, compra, items) -> list:
        detalles_objs = []
        for item in items:
            calc = self._calcular_detalle(item)
            producto = self._get_producto(item['id_producto'])
            variante = None
            if item.get('id_variante'):
                from apps.inventory.models import VarianteProducto
                variante = VarianteProducto.objects.get(id=item['id_variante'])
            detalles_objs.append(DetalleCompra(
                compra=compra,
                producto=producto,
                variante=variante,
                cantidad=calc['cantidad'],
                cantidad_recibida=0,
                precio_unitario=calc['precio_unitario'],
                descuento=calc['descuento'],
                subtotal=calc['subtotal'],
                impuesto_tasa=calc['impuesto_tasa'],
                impuesto_monto=calc['impuesto_monto'],
                total=calc['total'],
            ))
        return self.detalle_repo.bulk_create(detalles_objs)

    # ── CRUD ──────────────────────────────────────────────────────────────────

    @transaction.atomic
    def crear_compra(self, data: dict) -> Compra:
        items = data.get('items', [])
        if not items:
            raise CompraEmptyDetallesException()

        proveedor = self._get_proveedor(data['id_proveedor'])
        sucursal = self._get_sucursal(data['id_sucursal'])

        compra = self.compra_repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            proveedor=proveedor,
            sucursal=sucursal,
            estado='borrador',
            fecha_entrega=data.get('fecha_entrega'),
            fecha_vencimiento=data.get('fecha_vencimiento'),
            metodo_pago=data.get('metodo_pago'),
            numero_factura=data.get('numero_factura', ''),
            orden_compra=data.get('orden_compra', ''),
            notas=data.get('notas', ''),
            total=0,
            created_by=self.usuario,
        )

        detalles = self._build_detalles(compra, items)

        totales = self._calcular_totales_compra(detalles)
        for campo, valor in totales.items():
            setattr(compra, campo, valor)
        compra.saldo_pendiente = totales['total']
        compra.updated_by = self.usuario
        self.compra_repo.save(compra)

        publicar_compra_creada(compra, detalles)
        _evaluar_insignias_compra(compra)
        logger.info(f"✅ Compra creada: {compra.folio} — ${compra.total}")
        return compra

    def obtener_compra(self, id_compra: int) -> Compra:
        compra = self.compra_repo.get_by_id(id_compra, self.empresa)
        if not compra:
            raise CompraNotFoundException()
        return compra

    def listar_compras(self, filters: dict = None):
        return self.compra_repo.list_by_empresa(self.empresa, filters)

    @transaction.atomic
    def actualizar_compra(self, id_compra: int, data: dict) -> Compra:
        compra = self.obtener_compra(id_compra)

        if compra.estado != 'borrador':
            raise CompraInvalidStateException(
                "Solo se pueden editar compras en estado borrador."
            )

        campos_simples = [
            'fecha_entrega', 'fecha_vencimiento', 'metodo_pago',
            'numero_factura', 'orden_compra', 'notas',
        ]
        for campo in campos_simples:
            if campo in data:
                setattr(compra, campo, data[campo])

        if 'items' in data:
            items = data['items']
            if not items:
                raise CompraEmptyDetallesException()
            compra.detalles.all().delete()
            detalles = self._build_detalles(compra, items)
            totales = self._calcular_totales_compra(detalles)
            for campo, valor in totales.items():
                setattr(compra, campo, valor)
            compra.saldo_pendiente = totales['total']

        compra.updated_by = self.usuario
        self.compra_repo.save(compra)
        return compra

    @transaction.atomic
    def confirmar_compra(self, id_compra: int) -> Compra:
        compra = self.obtener_compra(id_compra)
        if not compra.puede_confirmarse():
            raise CompraInvalidStateException(
                f"La compra {compra.folio} no puede confirmarse desde '{compra.estado}'."
            )
        if not compra.detalles.exists():
            raise CompraEmptyDetallesException()

        compra.estado = 'activo'
        compra.updated_by = self.usuario
        self.compra_repo.save(compra)
        logger.info(f"✅ Compra confirmada: {compra.folio}")
        return compra

    @transaction.atomic
    def cancelar_compra(self, id_compra: int, motivo: str = '') -> Compra:
        compra = self.obtener_compra(id_compra)
        if not compra.puede_cancelarse():
            raise CompraInvalidStateException(
                f"La compra {compra.folio} no puede cancelarse desde '{compra.estado}'."
            )

        compra.estado = 'cancelada'
        if motivo:
            compra.notas = f"{compra.notas}\n[CANCELACIÓN] {motivo}".strip()
        compra.updated_by = self.usuario
        self.compra_repo.save(compra)
        publicar_compra_cancelada(compra)
        logger.info(f"✅ Compra cancelada: {compra.folio}")
        return compra

    @transaction.atomic
    def recibir_mercancia(self, id_compra: int, items_recibidos: list[dict]) -> Compra:
        compra = self.obtener_compra(id_compra)

        if not compra.puede_recibirse():
            raise CompraInvalidStateException(
                f"La compra {compra.folio} no puede recibirse en estado '{compra.estado}'."
            )

        detalles = list(compra.detalles.select_related('producto').all())
        CompraValidator.validar_cantidades_recepcion(detalles, items_recibidos)

        detalle_map = {d.id_detalle: d for d in detalles}
        items_para_evento = []

        for item in items_recibidos:
            detalle = detalle_map[item['id_detalle']]
            cantidad = Decimal(str(item['cantidad_recibida']))
            detalle.cantidad_recibida += cantidad
            self.detalle_repo.save(detalle)
            items_para_evento.append({
                'id_producto': detalle.producto_id,
                'id_variante': detalle.variante_id,
                'cantidad_recibida': float(cantidad),
                'precio_unitario': float(detalle.precio_unitario),
            })

        todos_recibidos = all(
            d.cantidad_recibida >= d.cantidad
            for d in compra.detalles.all()
        )
        compra.estado = 'recibida' if todos_recibidos else 'recibida_parcial'
        compra.updated_by = self.usuario
        self.compra_repo.save(compra)

        publicar_compra_recibida(compra, items_para_evento)
        logger.info(f"✅ Recepción registrada: {compra.folio} — Estado: {compra.estado}")
        return compra
