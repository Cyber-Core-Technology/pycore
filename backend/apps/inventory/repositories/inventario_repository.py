from apps.inventory.models import Inventario


class InventarioRepository:

    def get_by_producto_sucursal(self, producto, sucursal, variante=None):
        try:
            return Inventario.objects.get(
                producto=producto, sucursal=sucursal, variante=variante
            )
        except Inventario.DoesNotExist:
            return None

    def get_or_create(self, empresa, producto, sucursal, variante=None):
        obj, created = Inventario.objects.get_or_create(
            producto=producto,
            sucursal=sucursal,
            variante=variante,
            defaults={'empresa': empresa, 'stock_actual': 0, 'costo_promedio': 0}
        )
        return obj

    def get_by_empresa(self, empresa):
        return Inventario.objects.filter(empresa=empresa).select_related(
            'producto', 'producto__unidad_medida',
            'sucursal', 'variante', 'variante__unidad_medida',
        ).order_by('producto__nombre')

    def get_by_sucursal(self, empresa, sucursal):
        return Inventario.objects.filter(
            empresa=empresa, sucursal=sucursal
        ).select_related(
            'producto', 'producto__unidad_medida',
            'variante', 'variante__unidad_medida',
        ).order_by('producto__nombre')

    def actualizar_stock(self, inventario, nuevo_stock, nuevo_costo_promedio=None):
        inventario.stock_actual = nuevo_stock
        campos = ['stock_actual', 'updated_at']
        if nuevo_costo_promedio is not None:
            inventario.costo_promedio = nuevo_costo_promedio
            campos.append('costo_promedio')
        inventario.save(update_fields=campos)
        return inventario
