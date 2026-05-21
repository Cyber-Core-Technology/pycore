from django.contrib import admin
from apps.hr.models import Colaborador, Asistencia


@admin.register(Colaborador)
class ColaboradorAdmin(admin.ModelAdmin):
    list_display = ['numero_empleado', 'nombre', 'apellido_paterno', 'puesto', 'departamento', 'estado', 'sucursal', 'fecha_ingreso']
    list_filter = ['estado', 'tipo_contrato', 'departamento', 'empresa', 'sucursal']
    search_fields = ['nombre', 'apellido_paterno', 'numero_empleado', 'curp', 'rfc', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Identificación', {
            'fields': ('id', 'numero_empleado', 'empresa', 'sucursal')
        }),
        ('Datos Personales', {
            'fields': ('nombre', 'apellido_paterno', 'apellido_materno', 'fecha_nacimiento', 'curp', 'rfc', 'nss')
        }),
        ('Contacto', {
            'fields': ('email', 'telefono')
        }),
        ('Datos Laborales', {
            'fields': ('puesto', 'departamento', 'fecha_ingreso', 'fecha_baja', 'tipo_contrato', 'salario_diario', 'estado')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Asistencia)
class AsistenciaAdmin(admin.ModelAdmin):
    list_display = ['colaborador', 'fecha', 'tipo', 'estado', 'hora_registro', 'registrado_por']
    list_filter = ['tipo', 'estado', 'fecha', 'empresa']
    search_fields = ['colaborador__nombre', 'colaborador__numero_empleado']
    readonly_fields = ['id', 'created_at']
