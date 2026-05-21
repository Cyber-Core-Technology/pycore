from django.contrib import admin
from apps.audit.models import LogAuditoria


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['accion', 'empresa', 'tabla', 'id_registro', 'usuario_email', 'created_at']
    list_filter = ['accion', 'tabla', 'empresa']
    search_fields = ['usuario_email', 'id_registro', 'tabla']
    readonly_fields = ['id', 'accion', 'empresa', 'usuario', 'usuario_email',
                       'tabla', 'id_registro', 'payload', 'datos_anteriores',
                       'datos_nuevos', 'ip_address', 'user_agent', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
