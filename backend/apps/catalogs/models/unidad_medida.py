import uuid
from django.db import models
from apps.core.models.empresa import Empresa

TIPOS_UNIDAD = [
    ('pieza', 'Pieza'),
    ('peso', 'Peso'),
    ('volumen', 'Volumen'),
    ('longitud', 'Longitud'),
    ('tiempo', 'Tiempo'),
    ('area', 'Área'),
    ('otro', 'Otro'),
]


class UnidadMedida(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='unidades_medida',
    )
    codigo = models.CharField(max_length=10)
    nombre = models.CharField(max_length=50)
    abreviatura = models.CharField(max_length=10, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPOS_UNIDAD, default='pieza')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'catalogs_unidades_medida'
        verbose_name = 'Unidad de Medida'
        verbose_name_plural = 'Unidades de Medida'
        unique_together = [('empresa', 'codigo')]
        indexes = [
            models.Index(fields=['empresa', 'activo']),
        ]

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'
