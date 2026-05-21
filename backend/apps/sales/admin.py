from django.contrib import admin
from apps.sales.models import Venta, DetalleVenta, Devolucion, DetalleDevolucion, Promocion


class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 0
    readonly_fields = ['subtotal', 'impuesto_monto', 'total', 'costo_unitario', 'costo_total']


class DetalleDevolucionInline(admin.TabularInline):
    model = DetalleDevolucion
    extra = 0
    readonly_fields = ['subtotal', 'impuesto_monto', 'total']


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['folio', 'empresa', 'cliente', 'sucursal', 'estado', 'total', 'fecha_venta']
    list_filter = ['estado', 'metodo_pago', 'fecha_venta']
    search_fields = ['folio']
    readonly_fields = ['folio', 'uuid', 'subtotal', 'impuestos', 'total', 'created_at', 'updated_at']
    inlines = [DetalleVentaInline]


@admin.register(Devolucion)
class DevolucionAdmin(admin.ModelAdmin):
    list_display = ['folio', 'venta', 'total', 'reembolsado', 'fecha_devolucion']
    readonly_fields = ['folio', 'uuid', 'subtotal', 'impuestos', 'total', 'created_at']
    inlines = [DetalleDevolucionInline]


@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'codigo', 'tipo_descuento', 'descuento', 'fecha_inicio', 'fecha_fin', 'activo']
    list_filter = ['activo', 'tipo_descuento', 'aplica_a']
    search_fields = ['nombre', 'codigo']
