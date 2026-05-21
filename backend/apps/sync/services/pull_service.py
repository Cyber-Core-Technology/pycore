import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


class PullService:

    def __init__(self, empresa, sucursal, usuario):
        self.empresa = empresa
        self.sucursal = sucursal
        self.usuario = usuario

    def generar_snapshot(self) -> dict:
        return {
            'timestamp': timezone.now().isoformat(),
            'empresa_id': str(self.empresa.id_empresa),
            'sucursal_id': str(self.sucursal.id_sucursal),
            'productos': self._productos(),
            'stock': self._stock(),
            'clientes': self._clientes(),
            'impuestos': self._impuestos(),
            'categorias': self._categorias(),
        }

    def _productos(self) -> list:
        from apps.inventory.models import Producto
        result = []
        for p in Producto.objects.filter(empresa=self.empresa, activo=True).prefetch_related('variantes'):
            result.append({
                'id': str(p.id),
                'nombre': p.nombre,
                'sku': p.sku or '',
                'codigo_barras': p.codigo_barras or '',
                'precio_venta': float(p.precio_venta),
                'precio_compra': float(p.precio_compra or 0),
                'maneja_inventario': p.maneja_inventario,
                'tiene_variantes': p.tiene_variantes,
                'variantes': [
                    {'id': str(v.id), 'nombre': v.nombre, 'sku': v.sku or ''}
                    for v in p.variantes.filter(activo=True)
                ],
            })
        return result

    def _stock(self) -> list:
        from apps.inventory.models import Inventario
        result = []
        for inv in Inventario.objects.filter(empresa=self.empresa, sucursal=self.sucursal):
            result.append({
                'producto_id': str(inv.producto_id),
                'variante_id': str(inv.variante_id) if inv.variante_id else None,
                'stock_actual': float(inv.stock_actual),
                'stock_reservado': float(inv.stock_reservado),
                'stock_disponible': float(inv.stock_disponible),
            })
        return result

    def _clientes(self) -> list:
        from apps.terceros.models import Cliente
        result = []
        for c in Cliente.objects.filter(empresa=self.empresa, activo=True):
            result.append({
                'id': str(c.id),
                'nombre': c.nombre_comercial or c.razon_social or '',
                'rfc': c.rfc or '',
                'email': c.email or '',
            })
        return result

    def _impuestos(self) -> list:
        from apps.catalogs.models import Impuesto
        result = []
        try:
            for i in Impuesto.objects.filter(activo=True):
                result.append({'id': str(i.id), 'nombre': i.nombre, 'tasa': float(i.tasa), 'tipo': i.tipo})
        except Exception as e:
            logger.warning(f"[Sync] impuestos error: {e}")
        return result

    def _categorias(self) -> list:
        from apps.catalogs.models import Categoria
        result = []
        try:
            for c in Categoria.objects.filter(activo=True):
                result.append({'id': str(c.id), 'nombre': c.nombre})
        except Exception as e:
            logger.warning(f"[Sync] categorias error: {e}")
        return result
