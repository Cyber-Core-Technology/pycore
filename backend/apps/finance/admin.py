from django.contrib import admin
from apps.finance.models import (
    CuentaBancaria, CuentaPorCobrar, CuentaPorPagar,
    PagoCliente, PagoProveedor, Gasto,
)


@admin.register(CuentaBancaria)
class CuentaBancariaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'banco', 'tipo_cuenta', 'moneda', 'saldo_actual', 'es_principal', 'activo']
    list_filter = ['tipo_cuenta', 'moneda', 'activo']


@admin.register(CuentaPorCobrar)
class CxCAdmin(admin.ModelAdmin):
    list_display = ['folio', 'cliente', 'monto_original', 'saldo_pendiente', 'fecha_vencimiento', 'estado']
    list_filter = ['estado']
    search_fields = ['folio']


@admin.register(CuentaPorPagar)
class CxPAdmin(admin.ModelAdmin):
    list_display = ['folio', 'proveedor', 'monto_original', 'saldo_pendiente', 'fecha_vencimiento', 'estado']
    list_filter = ['estado']
    search_fields = ['folio']


@admin.register(PagoCliente)
class PagoClienteAdmin(admin.ModelAdmin):
    list_display = ['folio', 'cxc', 'monto', 'metodo_pago', 'fecha_pago']


@admin.register(PagoProveedor)
class PagoProveedorAdmin(admin.ModelAdmin):
    list_display = ['folio', 'cxp', 'monto', 'metodo_pago', 'fecha_pago']


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ['folio', 'concepto', 'categoria', 'total', 'metodo_pago', 'fecha_gasto']
    list_filter = ['categoria', 'metodo_pago']
