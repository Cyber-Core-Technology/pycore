import uuid
from django.db import models


class CuentaPorCobrar(models.Model):
    """
    Generada automáticamente cuando se crea una venta a crédito.
    saldo_pendiente se reduce con cada PagoCliente registrado.
    Se cancela via evento cuando la venta se cancela.
    """

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagada_parcial', 'Pagada Parcial'),
        ('pagada', 'Pagada'),
        ('vencida', 'Vencida'),
        ('cancelada', 'Cancelada'),
    ]

    id_cxc = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    folio = models.CharField(max_length=50, unique=True)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='cuentas_por_cobrar',
    )
    cliente = models.ForeignKey(
        'terceros.Cliente',
        on_delete=models.PROTECT,
        related_name='cuentas_por_cobrar',
    )
    venta = models.OneToOneField(
        'sales.Venta',
        on_delete=models.PROTECT,
        related_name='cuenta_por_cobrar',
        null=True, blank=True,
    )

    monto_original = models.DecimalField(max_digits=12, decimal_places=2)
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2)

    fecha_emision = models.DateField(auto_now_add=True)
    fecha_vencimiento = models.DateField()

    estado = models.CharField(
        max_length=20, choices=ESTADO_CHOICES, default='pendiente'
    )

    notas = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='cxc_creadas',
        null=True, blank=True,
    )

    class Meta:
        db_table = 'cuentas_por_cobrar'
        ordering = ['fecha_vencimiento', '-id_cxc']
        indexes = [
            models.Index(fields=['empresa', 'estado']),
            models.Index(fields=['cliente']),
            models.Index(fields=['fecha_vencimiento']),
        ]

    def __str__(self):
        return f"CxC {self.folio} — ${self.saldo_pendiente}"

    def esta_vencida(self) -> bool:
        from django.utils import timezone
        return (
            self.estado in ('pendiente', 'pagada_parcial') and
            self.fecha_vencimiento < timezone.now().date()
        )

    def actualizar_estado(self):
        if self.saldo_pendiente <= 0:
            self.estado = 'pagada'
        elif self.saldo_pendiente < self.monto_original:
            self.estado = 'pagada_parcial'
        elif self.esta_vencida():
            self.estado = 'vencida'
