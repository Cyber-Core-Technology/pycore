from django.contrib import admin
from .models import Empresa, Sucursal, Configuracion


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'slug', 'tipo_negocio', 'plan', 'activo', 'fecha_registro')
    list_filter   = ('tipo_negocio', 'plan', 'activo')
    search_fields = ('nombre', 'rfc', 'slug')
    readonly_fields = ('id_empresa', 'fecha_registro', 'fecha_actualizacion')


@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'empresa', 'codigo', 'es_principal', 'activo')
    list_filter   = ('es_principal', 'activo')
    search_fields = ('nombre', 'codigo', 'empresa__nombre')
    readonly_fields = ('id_sucursal', 'fecha_registro')


@admin.register(Configuracion)
class ConfiguracionAdmin(admin.ModelAdmin):
    list_display  = ('empresa', 'moneda', 'genera_cfdi', 'maneja_inventario')
    readonly_fields = ('id_config', 'fecha_actualizacion')
