import uuid
from django.db import models
from apps.core.models.empresa import Empresa


class Categoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='categorias',
    )
    codigo = models.CharField(max_length=20, blank=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    padre = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subcategorias',
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'catalogs_categorias'
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        unique_together = [('empresa', 'codigo')]
        indexes = [
            models.Index(fields=['empresa', 'activo']),
        ]

    def __str__(self):
        return f'{self.nombre} ({self.empresa})'

    @property
    def ruta_completa(self):
        if self.padre:
            return f'{self.padre.ruta_completa} → {self.nombre}'
        return self.nombre
