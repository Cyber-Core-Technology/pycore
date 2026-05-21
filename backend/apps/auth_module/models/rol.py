import uuid
from django.db import models
from apps.core.models.empresa import Empresa

ROLES_SISTEMA = [
    ('admin', 'Administrador'),
    ('vendedor', 'Vendedor'),
    ('almacenista', 'Almacenista'),
    ('contador', 'Contador'),
    ('rrhh', 'Recursos Humanos'),
    ('gerente', 'Gerente'),
]

_NOMBRE_TO_SLUG = {nombre: slug for slug, nombre in ROLES_SISTEMA}
_NOMBRE_TO_SLUG.update({slug: slug for slug, _ in ROLES_SISTEMA})  # también acepta el slug directo


class Rol(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='roles',
    )
    nombre = models.CharField(max_length=50)
    slug = models.CharField(max_length=50, blank=True, db_index=True)
    descripcion = models.TextField(blank=True)
    es_sistema = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'auth_roles'
        unique_together = ('empresa', 'nombre')
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _NOMBRE_TO_SLUG.get(self.nombre, self.nombre.lower().replace(' ', '_'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.nombre} ({self.empresa})'


class UsuarioRol(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.CASCADE,
        related_name='usuario_roles',
    )
    rol = models.ForeignKey(
        Rol,
        on_delete=models.CASCADE,
        related_name='usuario_roles',
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='usuario_roles',
        help_text='Si es None, el rol aplica a toda la empresa',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auth_usuario_roles'
        unique_together = ('usuario', 'rol', 'sucursal')
        verbose_name = 'Usuario-Rol'
        verbose_name_plural = 'Usuarios-Roles'


class UsuarioSucursal(models.Model):
    usuario = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.CASCADE,
        related_name='usuario_sucursales',
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.CASCADE,
        related_name='usuario_sucursales',
    )
    es_predeterminada = models.BooleanField(default=False)

    class Meta:
        db_table = 'auth_usuario_sucursales'
        unique_together = ('usuario', 'sucursal')
        verbose_name = 'Usuario-Sucursal'
        verbose_name_plural = 'Usuarios-Sucursales'

    def __str__(self):
        return f'{self.usuario} → {self.sucursal}'
