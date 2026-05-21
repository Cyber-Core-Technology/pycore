import uuid
from django.db import models


class PagoCliente(models.Model):
    """
    Registro de un pago recibido de un cliente contra una CxC.
    Cada pago reduce el saldo_pendiente de la CxC correspondiente.
    Puede asociarse a una cuenta bancaria para control de flujo de caja.
    """

    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta_debito', 'Tarjeta de Débito'),
        ('tarjeta_credito', 'Tarjeta de Crédito'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('otro', 'Otro'),
    ]

    id_pago = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    folio = models.CharField(max_length=50, unique=True)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='pagos_clientes',
    )
    cxc = models.ForeignKey(
        'finance.CuentaPorCobrar',
        on_delete=models.PROTECT,
        related_name='pagos',
    )
    cuenta_bancaria = models.ForeignKey(
        'finance.CuentaBancaria',
        on_delete=models.PROTECT,
        related_name='pagos_clientes',
        null=True, blank=True,
    )

    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    fecha_pago = models.DateField()
    referencia = models.CharField(max_length=100, blank=True, default='')
    notas = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='pagos_clientes_registrados',
        null=True, blank=True,
    )

    class Meta:
        db_table = 'pagos_clientes'
        ordering = ['-fecha_pago', '-id_pago']
        indexes = [
            models.Index(fields=['empresa', 'fecha_pago']),
            models.Index(fields=['cxc']),
        ]

    def __str__(self):
        return f"Pago {self.folio} — ${self.monto}"
