from django.contrib import admin
from apps.purchases.models import Compra, DetalleCompra


class DetalleCompraInline(admin.TabularInline):
    model = DetalleCompra
    extra = 0
    readonly_fields = ['subtotal', 'impuesto_monto', 'total', 'cantidad_recibida', 'created_at']
    fields = [
        'producto', 'variante',
        'cantidad', 'cantidad_recibida',
        'precio_unitario', 'descuento',
        'subtotal', 'impuesto_tasa', 'impuesto_monto', 'total',
    ]


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ['folio', 'empresa', 'proveedor', 'sucursal', 'estado', 'total', 'fecha_compra']
    list_filter = ['estado', 'fecha_compra', 'metodo_pago']
    search_fields = ['folio', 'numero_factura', 'orden_compra']
    readonly_fields = ['folio', 'uuid', 'subtotal', 'impuestos', 'total', 'created_at', 'updated_at', 'created_by', 'updated_by']
    inlines = [DetalleCompraInline]
    ordering = ['-fecha_compra']
