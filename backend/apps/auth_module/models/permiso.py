import uuid
from django.db import models

MODULOS = [
    ('core', 'Core'),
    ('inventario', 'Inventario'),
    ('ventas', 'Ventas'),
    ('compras', 'Compras'),
    ('finanzas', 'Finanzas'),
    ('rrhh', 'Recursos Humanos'),
    ('auditoria', 'Auditoría'),
]

ACCIONES = [
    ('ver', 'Ver'),
    ('crear', 'Crear'),
    ('editar', 'Editar'),
    ('eliminar', 'Eliminar'),
    ('exportar', 'Exportar'),
    ('admin', 'Administrar'),
]


class Permiso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    modulo = models.CharField(max_length=50, choices=MODULOS)
    accion = models.CharField(max_length=50, choices=ACCIONES)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'auth_permisos'
        unique_together = ('modulo', 'accion')
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'

    def __str__(self):
        return f'{self.modulo}.{self.accion}'

    @property
    def codigo(self):
        return f'{self.modulo}.{self.accion}'


class RolPermiso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rol = models.ForeignKey(
        'auth_module.Rol',
        on_delete=models.CASCADE,
        related_name='rol_permisos',
    )
    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        related_name='rol_permisos',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auth_rol_permisos'
        unique_together = ('rol', 'permiso')
