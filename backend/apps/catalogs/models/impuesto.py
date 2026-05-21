import uuid
from django.db import models
from apps.core.models.empresa import Empresa

TIPOS_IMPUESTO = [
    ('IVA', 'IVA'),
    ('IEPS', 'IEPS'),
    ('ISR', 'ISR'),
    ('otro', 'Otro'),
]


class Impuesto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='impuestos',
    )
    codigo = models.CharField(max_length=10)
    nombre = models.CharField(max_length=50)
    tasa = models.DecimalField(max_digits=5, decimal_places=2)
    tipo = models.CharField(max_length=20, choices=TIPOS_IMPUESTO, default='IVA')
    es_retencion = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'catalogs_impuestos'
        verbose_name = 'Impuesto'
        verbose_name_plural = 'Impuestos'
        unique_together = [('empresa', 'codigo')]
        indexes = [
            models.Index(fields=['empresa', 'activo']),
        ]

    def __str__(self):
        return f'{self.codigo} - {self.nombre} ({self.tasa}%)'
