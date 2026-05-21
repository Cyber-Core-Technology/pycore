import uuid
from django.db import models


class Gasto(models.Model):
    """
    Gastos operativos de la empresa no relacionados a compras de inventario.
    Ejemplos: renta, servicios, nómina, mantenimiento.
    """

    CATEGORIA_CHOICES = [
        ('renta', 'Renta'),
        ('servicios', 'Servicios'),
        ('nomina', 'Nómina'),
        ('mantenimiento', 'Mantenimiento'),
        ('marketing', 'Marketing'),
        ('transporte', 'Transporte'),
        ('impuestos', 'Impuestos'),
        ('otro', 'Otro'),
    ]

    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta_debito', 'Tarjeta de Débito'),
        ('tarjeta_credito', 'Tarjeta de Crédito'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('otro', 'Otro'),
    ]

    id_gasto = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    folio = models.CharField(max_length=50, unique=True)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='gastos',
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.PROTECT,
        related_name='gastos',
        null=True, blank=True,
    )
    cuenta_bancaria = models.ForeignKey(
        'finance.CuentaBancaria',
        on_delete=models.PROTECT,
        related_name='gastos',
        null=True, blank=True,
    )

    concepto = models.CharField(max_length=255)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='otro')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto_monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    fecha_gasto = models.DateField()
    referencia = models.CharField(max_length=100, blank=True, default='')
    comprobante_url = models.URLField(blank=True, default='')
    notas = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='gastos_registrados',
        null=True, blank=True,
    )

    class Meta:
        db_table = 'gastos'
        ordering = ['-fecha_gasto', '-id_gasto']
        indexes = [
            models.Index(fields=['empresa', 'fecha_gasto']),
            models.Index(fields=['categoria']),
        ]

    def __str__(self):
        return f"Gasto {self.folio} — {self.concepto} ${self.total}"
