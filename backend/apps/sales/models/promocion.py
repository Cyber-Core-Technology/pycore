import uuid
from django.db import models


class Promocion(models.Model):
    """
    Descuentos aplicables a ventas.
    aplica_a controla el alcance: total, producto específico o categoría.
    ids_aplicables es JSON con UUIDs de productos o categorías cuando aplica.
    """

    TIPO_DESCUENTO_CHOICES = [
        ('porcentaje', 'Porcentaje'),
        ('monto_fijo', 'Monto Fijo'),
    ]

    APLICA_A_CHOICES = [
        ('total', 'Total de la venta'),
        ('producto', 'Producto específico'),
        ('categoria', 'Categoría'),
    ]

    id_promocion = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='promociones',
    )

    codigo = models.CharField(max_length=50, null=True, blank=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, default='')

    tipo_descuento = models.CharField(
        max_length=20, choices=TIPO_DESCUENTO_CHOICES, default='porcentaje'
    )
    descuento = models.DecimalField(max_digits=12, decimal_places=2)

    aplica_a = models.CharField(
        max_length=20, choices=APLICA_A_CHOICES, default='total'
    )
    ids_aplicables = models.JSONField(default=list, blank=True)

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    monto_minimo_compra = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    cantidad_maxima_uso = models.IntegerField(null=True, blank=True)
    cantidad_usado = models.IntegerField(default=0)

    activo = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='promociones_creadas',
        null=True, blank=True,
    )
    updated_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='updated_by',
        related_name='promociones_actualizadas',
        null=True, blank=True,
    )

    class Meta:
        db_table = 'promociones'
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['empresa', 'activo']),
            models.Index(fields=['fecha_inicio', 'fecha_fin']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'codigo'],
                condition=models.Q(codigo__isnull=False),
                name='unique_promocion_codigo_empresa',
            )
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo or 'sin código'})"

    def esta_vigente(self) -> bool:
        from django.utils import timezone
        hoy = timezone.now().date()
        return self.activo and self.fecha_inicio <= hoy <= self.fecha_fin

    def tiene_usos_disponibles(self) -> bool:
        if self.cantidad_maxima_uso is None:
            return True
        return self.cantidad_usado < self.cantidad_maxima_uso

    def puede_aplicarse(self, subtotal=None) -> bool:
        if not self.esta_vigente():
            return False
        if not self.tiene_usos_disponibles():
            return False
        if self.monto_minimo_compra and subtotal:
            return subtotal >= self.monto_minimo_compra
        return True
