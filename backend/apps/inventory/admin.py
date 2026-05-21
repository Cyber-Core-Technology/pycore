from django.contrib import admin
from apps.inventory.models import Producto, VarianteProducto, Inventario, MovimientoInventario


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'sku', 'tipo', 'precio_venta', 'precio_compra', 'maneja_inventario', 'activo']
    list_filter = ['tipo', 'maneja_inventario', 'tiene_variantes', 'activo', 'empresa']
    search_fields = ['nombre', 'sku', 'codigo_barras', 'codigo']


@admin.register(VarianteProducto)
class VarianteAdmin(admin.ModelAdmin):
    list_display = ['producto', 'nombre', 'sku', 'unidad_medida', 'es_por_peso', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre', 'sku']
    autocomplete_fields = ['unidad_medida']

    @admin.display(boolean=True, description='Por peso/volumen')
    def es_por_peso(self, obj):
        return obj.es_por_peso


@admin.register(Inventario)
class InventarioAdmin(admin.ModelAdmin):
    list_display = ['producto', 'sucursal', 'stock_actual', 'stock_reservado', 'costo_promedio']
    list_filter = ['sucursal', 'empresa']
    search_fields = ['producto__nombre']


@admin.register(MovimientoInventario)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = ['folio', 'tipo_movimiento', 'producto', 'cantidad', 'sucursal', 'created_at']
    list_filter = ['tipo_movimiento', 'tipo_referencia', 'empresa']
    search_fields = ['folio', 'producto__nombre']
    readonly_fields = ['folio', 'created_at']
