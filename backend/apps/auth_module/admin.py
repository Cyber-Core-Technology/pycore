from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from apps.auth_module.models import Usuario, Rol, UsuarioRol, Permiso, RolPermiso


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ['email', 'username', 'nombre_completo', 'empresa', 'activo', 'verificado', 'ultimo_acceso']
    list_filter = ['activo', 'verificado', 'empresa', 'is_staff']
    search_fields = ['email', 'username', 'nombre', 'apellido_paterno']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Información personal', {'fields': ('nombre', 'apellido_paterno', 'apellido_materno', 'telefono', 'foto_url')}),
        ('Empresa', {'fields': ('empresa',)}),
        ('Acceso', {'fields': ('activo', 'verificado', 'is_staff', 'is_superuser', 'intentos_fallidos', 'bloqueado_hasta')}),
        ('Preferencias', {'fields': ('idioma', 'zona_horaria', 'tema')}),
        ('Fechas', {'fields': ('ultimo_acceso', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'nombre', 'empresa', 'password1', 'password2'),
        }),
    )
    readonly_fields = ['ultimo_acceso', 'last_login', 'intentos_fallidos']


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'empresa', 'es_sistema', 'activo']
    list_filter = ['es_sistema', 'activo', 'empresa']
    search_fields = ['nombre', 'empresa__nombre']


@admin.register(UsuarioRol)
class UsuarioRolAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'rol', 'sucursal', 'created_at']
    list_filter = ['rol__nombre']
    search_fields = ['usuario__email', 'rol__nombre']


@admin.register(Permiso)
class PermisoAdmin(admin.ModelAdmin):
    list_display = ['modulo', 'accion', 'codigo', 'activo']
    list_filter = ['modulo', 'accion', 'activo']


@admin.register(RolPermiso)
class RolPermisoAdmin(admin.ModelAdmin):
    list_display = ['rol', 'permiso']
    list_filter = ['rol__nombre', 'permiso__modulo']
