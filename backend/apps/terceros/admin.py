from django.contrib import admin
from apps.terceros.models import Cliente, Proveedor


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nombre_comercial', 'codigo', 'rfc', 'tipo_cliente', 'limite_credito', 'credito_disponible', 'activo']
    list_filter = ['tipo_cliente', 'tipo_persona', 'activo', 'empresa']
    search_fields = ['nombre_comercial', 'rfc', 'codigo', 'email']


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ['nombre_comercial', 'codigo', 'rfc', 'tipo_proveedor', 'contacto_principal', 'activo']
    list_filter = ['tipo_proveedor', 'tipo_persona', 'activo', 'empresa']
    search_fields = ['nombre_comercial', 'rfc', 'codigo', 'contacto_principal']
