from django.contrib import admin
from apps.catalogs.models import Categoria, UnidadMedida, Impuesto


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'codigo', 'padre', 'empresa', 'activo']
    list_filter = ['activo', 'empresa']
    search_fields = ['nombre', 'codigo']
    raw_id_fields = ['padre']


@admin.register(UnidadMedida)
class UnidadMedidaAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'abreviatura', 'tipo', 'empresa', 'activo']
    list_filter = ['tipo', 'activo', 'empresa']
    search_fields = ['codigo', 'nombre']


@admin.register(Impuesto)
class ImpuestoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'tasa', 'tipo', 'es_retencion', 'empresa', 'activo']
    list_filter = ['tipo', 'es_retencion', 'activo', 'empresa']
    search_fields = ['codigo', 'nombre']
