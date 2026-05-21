import logging
from django.db import transaction
from django.utils import timezone

from apps.sync.models import SyncLog
from shared.exceptions import BusinessException

logger = logging.getLogger(__name__)


class PushService:
    """
    Recibe ventas generadas offline y las sincroniza con el servidor.

    Estrategia de conflictos:
    - Aplica ventas en orden cronológico por created_at del dispositivo
    - Si stock queda negativo → marca venta con conflicto=True
    - Venta duplicada (mismo offline_id) → se ignora silenciosamente
    - El gerente resuelve conflictos desde el panel admin
    """

    def __init__(self, empresa, sucursal, usuario, dispositivo_id=''):
        self.empresa = empresa
        self.sucursal = sucursal
        self.usuario = usuario
        self.dispositivo_id = dispositivo_id

    def sincronizar(self, ventas_payload: list, ip_address=None) -> dict:
        """
        Procesa lista de ventas offline.

        Args:
            ventas_payload: Lista de ventas en formato del dispositivo
            ip_address: IP del dispositivo para el log

        Returns:
            Resumen de la sincronización
        """
        resultado = {
            'ventas_recibidas': len(ventas_payload),
            'ventas_ok': 0,
            'ventas_conflicto': 0,
            'ventas_duplicadas': 0,
            'errores': [],
            'detalle': [],
        }

        # Ordenar por fecha de creación en el dispositivo
        ventas_ordenadas = sorted(
            ventas_payload,
            key=lambda v: v.get('created_at', ''),
        )

        for venta_data in ventas_ordenadas:
            try:
                res = self._procesar_venta(venta_data)
                resultado['detalle'].append(res)

                if res['estado'] == 'duplicada':
                    resultado['ventas_duplicadas'] += 1
                elif res['estado'] == 'conflicto':
                    resultado['ventas_conflicto'] += 1
                else:
                    resultado['ventas_ok'] += 1

            except Exception as e:
                logger.error(f"[Sync] Error procesando venta offline {venta_data.get('offline_id')}: {e}")
                resultado['errores'].append({
                    'offline_id': venta_data.get('offline_id'),
                    'error': str(e),
                })

        # Guardar log de sincronización
        estado_log = 'ok'
        if resultado['ventas_conflicto'] > 0:
            estado_log = 'conflicto'
        if resultado['errores']:
            estado_log = 'error'

        SyncLog.objects.create(
            empresa_id=self.empresa.id_empresa,
            id_usuario=self.usuario.id,
            sucursal_id=self.sucursal.id_sucursal,
            ventas_recibidas=resultado['ventas_recibidas'],
            ventas_ok=resultado['ventas_ok'],
            ventas_conflicto=resultado['ventas_conflicto'],
            ventas_duplicadas=resultado['ventas_duplicadas'],
            estado=estado_log,
            detalle=resultado,
            dispositivo_id=self.dispositivo_id,
            ip_address=ip_address,
        )

        return resultado

    @transaction.atomic
    def _procesar_venta(self, venta_data: dict) -> dict:
        """Procesa una venta individual con su lógica de conflictos."""
        from apps.sales.models import Venta, DetalleVenta
        from apps.inventory.models import Producto
        from apps.inventory.repositories import InventarioRepository
        from apps.inventory.services.movimiento_service import MovimientoService

        offline_id = venta_data.get('offline_id', '')

        # 1. Deduplicación — si ya existe este offline_id, ignorar
        if offline_id and Venta.objects.filter(
            offline_id=offline_id,
            empresa=self.empresa
        ).exists():
            logger.info(f"[Sync] Venta duplicada ignorada: {offline_id}")
            return {'offline_id': offline_id, 'estado': 'duplicada'}

        # 2. Verificar stock y detectar conflictos
        conflictos = []
        inv_repo = InventarioRepository()
        mov_service = MovimientoService()

        for item in venta_data.get('items', []):
            try:
                producto = Producto.objects.get(
                    id=item['producto_id'],
                    empresa=self.empresa,
                )
                if not producto.maneja_inventario:
                    continue

                inventario = inv_repo.get_or_create(
                    self.empresa, producto, self.sucursal
                )
                if inventario.stock_disponible < item['cantidad']:
                    conflictos.append({
                        'producto_id': item['producto_id'],
                        'producto_nombre': producto.nombre,
                        'stock_disponible': float(inventario.stock_disponible),
                        'cantidad_vendida': item['cantidad'],
                        'diferencia': float(inventario.stock_disponible - item['cantidad']),
                    })
            except Producto.DoesNotExist:
                conflictos.append({
                    'producto_id': item.get('producto_id'),
                    'error': 'Producto no encontrado',
                })

        # 3. Generar folio
        from apps.sales.services.venta_service import VentaService
        venta_service = VentaService(empresa=self.empresa, usuario=self.usuario)

        # 4. Crear la venta
        venta = Venta.objects.create(
            empresa=self.empresa,
            sucursal=self.sucursal,
            vendedor=self.usuario,
            cliente_id=venta_data.get('id_cliente') or None,
            folio=venta_service._generar_folio(),
            offline_id=offline_id,
            origen='offline',
            sincronizado_at=timezone.now(),
            estado='activo',
            subtotal=venta_data.get('subtotal', 0),
            descuento=venta_data.get('descuento', 0),
            impuestos=venta_data.get('impuestos', 0),
            total=venta_data.get('total', 0),
            metodo_pago=venta_data.get('metodo_pago', 'efectivo'),
            notas=venta_data.get('notas', ''),
            conflicto=bool(conflictos),
            conflicto_detalle=str(conflictos) if conflictos else '',
            created_by=self.usuario,
        )

        # 5. Crear detalles
        for item in venta_data.get('items', []):
            try:
                producto = Producto.objects.get(id=item['producto_id'], empresa=self.empresa)
                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=item['cantidad'],
                    precio_unitario=item['precio_unitario'],
                    descuento=item.get('descuento', 0),
                    subtotal=item.get('subtotal', 0),
                    impuestos=item.get('impuestos', 0),
                    total=item.get('total', 0),
                )
            except Producto.DoesNotExist:
                pass

        # 6. Descontar stock — incluso si hay conflicto (stock puede quedar negativo)
        for item in venta_data.get('items', []):
            try:
                producto = Producto.objects.get(id=item['producto_id'], empresa=self.empresa)
                if not producto.maneja_inventario:
                    continue
                mov_service.registrar_salida(
                    empresa=self.empresa,
                    sucursal=self.sucursal,
                    producto=producto,
                    cantidad=item['cantidad'],
                    tipo_referencia='venta',
                    referencia_id=venta.id_venta,
                    motivo=f"Venta offline {venta.folio}",
                )
            except Exception as e:
                logger.error(f"[Sync] Error descontando stock producto={item.get('producto_id')}: {e}")

        # 7. Publicar evento
        from shared.events import event_bus, DomainEvents
        event_bus.publish(DomainEvents.VENTA_CREADA, {
            'venta_id': venta.id_venta,
            'folio': venta.folio,
            'id_empresa': self.empresa.id_empresa,
            'id_sucursal': self.sucursal.id_sucursal,
            'id_cliente': venta_data.get('id_cliente'),
            'total': float(venta.total),
            'metodo_pago': venta.metodo_pago,
            'origen': 'offline',
            'items': venta_data.get('items', []),
        })

        estado = 'conflicto' if conflictos else 'ok'
        logger.info(f"[Sync] Venta offline procesada: {venta.folio} — {estado}")

        return {
            'offline_id': offline_id,
            'venta_id': venta.id_venta,
            'folio': venta.folio,
            'estado': estado,
            'conflictos': conflictos,
        }
