import uuid
from django.db import models


class Devolucion(models.Model):
    """
    Aggregate Root: Devolución
    Solo aplica devoluciones a clientes (no a proveedor).
    Genera ajuste de CxC en finance vía evento devolucion.creada.
    Regresa stock al inventario vía evento devolucion.creada.
    """

    METODO_REEMBOLSO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta_debito', 'Tarjeta de Débito'),
        ('tarjeta_credito', 'Tarjeta de Crédito'),
        ('transferencia', 'Transferencia'),
        ('nota_credito', 'Nota de Crédito'),
    ]

    id_devolucion = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    folio = models.CharField(max_length=50, unique=True)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='devoluciones',
    )
    venta = models.ForeignKey(
        'sales.Venta',
        on_delete=models.PROTECT,
        related_name='devoluciones',
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.PROTECT,
        related_name='devoluciones',
    )

    fecha_devolucion = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(max_length=255)
    observaciones = models.TextField(blank=True, default='')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impuestos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    metodo_reembolso = models.CharField(
        max_length=20, choices=METODO_REEMBOLSO_CHOICES, null=True, blank=True
    )
    reembolsado = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='devoluciones_creadas',
    )

    class Meta:
        db_table = 'devoluciones'
        ordering = ['-fecha_devolucion']
        indexes = [
            models.Index(fields=['empresa', 'fecha_devolucion']),
            models.Index(fields=['venta']),
        ]

    def __str__(self):
        return f"Devolución {self.folio} — ${self.total}"
