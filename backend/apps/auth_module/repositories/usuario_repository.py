from django.utils import timezone
from datetime import timedelta
from apps.auth_module.models import Usuario, Rol, UsuarioRol, UsuarioSucursal

MAX_INTENTOS = 5
BLOQUEO_MINUTOS = 30


class UsuarioRepository:

    def get_by_email(self, email: str) -> Usuario | None:
        try:
            return Usuario.objects.select_related('empresa').get(
                email=email, activo=True
            )
        except Usuario.DoesNotExist:
            return None

    def get_by_id(self, user_id) -> Usuario | None:
        try:
            return Usuario.objects.select_related('empresa').get(
                id=user_id, activo=True
            )
        except Usuario.DoesNotExist:
            return None

    def get_by_username(self, username: str) -> Usuario | None:
        try:
            return Usuario.objects.select_related('empresa').get(
                username=username, activo=True
            )
        except Usuario.DoesNotExist:
            return None

    def crear(self, **kwargs) -> Usuario:
        password = kwargs.pop('password')
        usuario = Usuario(**kwargs)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def registrar_acceso_exitoso(self, usuario: Usuario) -> None:
        usuario.ultimo_acceso = timezone.now()
        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        usuario.save(update_fields=['ultimo_acceso', 'intentos_fallidos', 'bloqueado_hasta'])

    def registrar_intento_fallido(self, usuario: Usuario) -> None:
        usuario.intentos_fallidos += 1
        if usuario.intentos_fallidos >= MAX_INTENTOS:
            usuario.bloqueado_hasta = timezone.now() + timedelta(minutes=BLOQUEO_MINUTOS)
        usuario.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])
        if usuario.intentos_fallidos >= MAX_INTENTOS:
            from apps.auth_module.events import publicar_usuario_bloqueado
            publicar_usuario_bloqueado(usuario)

    def get_roles_usuario(self, usuario: Usuario) -> list:
        return list(
            UsuarioRol.objects.filter(usuario=usuario)
            .select_related('rol')
            .values_list('rol__nombre', flat=True)
        )

    def get_sucursales_usuario(self, usuario: Usuario) -> list:
        return list(
            UsuarioSucursal.objects
            .filter(usuario=usuario)
            .select_related('sucursal')
            .values(
                'sucursal__id_sucursal',
                'sucursal__nombre',
                'sucursal__codigo',
                'sucursal__es_principal',
                'es_predeterminada',
            )
        )

    def asignar_sucursal(self, usuario: Usuario, sucursal, es_predeterminada: bool = False) -> UsuarioSucursal:
        us, _ = UsuarioSucursal.objects.get_or_create(
            usuario=usuario,
            sucursal=sucursal,
            defaults={'es_predeterminada': es_predeterminada},
        )
        return us

    def quitar_sucursal(self, usuario: Usuario, sucursal) -> None:
        UsuarioSucursal.objects.filter(usuario=usuario, sucursal=sucursal).delete()

    def set_sucursales(self, usuario: Usuario, sucursal_ids: list) -> None:
        """Reemplaza el conjunto completo de sucursales asignadas al usuario."""
        from apps.core.models import Sucursal
        sucursales = Sucursal.objects.filter(
            id_sucursal__in=sucursal_ids,
            empresa=usuario.empresa,
        )
        UsuarioSucursal.objects.filter(usuario=usuario).delete()
        for i, sucursal in enumerate(sucursales):
            UsuarioSucursal.objects.create(
                usuario=usuario,
                sucursal=sucursal,
                es_predeterminada=(i == 0),
            )

    def asignar_rol(self, usuario: Usuario, rol: Rol, sucursal=None) -> UsuarioRol:
        ur, _ = UsuarioRol.objects.get_or_create(
            usuario=usuario,
            rol=rol,
            sucursal=sucursal,
        )
        return ur
