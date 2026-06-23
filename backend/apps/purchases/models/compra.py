import uuid
from django.db import models


def comprobante_upload_to(instance, filename):
    """Conservada solo por compatibilidad con migraciones históricas (0002/0003).
    El comprobante ahora vive en el modelo CompraComprobante."""
    return f'compras/comprobantes/{instance.empresa_id}/{filename}'


class Compra(models.Model):

    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('activo', 'Activo'),
        ('recibida_parcial', 'Recibida Parcial'),
        ('recibida', 'Recibida'),
        ('cancelada', 'Cancelada'),
    ]

    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta_debito', 'Tarjeta de Débito'),
        ('tarjeta_credito', 'Tarjeta de Crédito'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('otro', 'Otro'),
    ]

    id_compra = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    folio = models.CharField(max_length=50, unique=True)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='compras',
    )
    proveedor = models.ForeignKey(
        'terceros.Proveedor',
        on_delete=models.PROTECT,
        related_name='compras',
        null=True,
        blank=True,
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.PROTECT,
        related_name='compras',
    )

    fecha_compra = models.DateField(auto_now_add=True)
    fecha_entrega = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impuestos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, null=True, blank=True)
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    numero_factura = models.CharField(max_length=50, blank=True, default='')
    orden_compra = models.CharField(max_length=50, blank=True, default='')
    notas = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='compras_creadas',
    )
    updated_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='updated_by',
        related_name='compras_actualizadas',
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'compras'
        ordering = ['-fecha_compra', '-id_compra']
        indexes = [
            models.Index(fields=['empresa', 'fecha_compra']),
            models.Index(fields=['proveedor']),
            models.Index(fields=['estado']),
            models.Index(fields=['folio']),
        ]

    def __str__(self):
        return f"Compra {self.folio} — ${self.total}"

    def puede_confirmarse(self) -> bool:
        return self.estado == 'borrador'

    def puede_cancelarse(self) -> bool:
        return self.estado in ('borrador', 'activo')

    def puede_recibirse(self) -> bool:
        return self.estado in ('activo', 'recibida_parcial')

    def esta_completamente_recibida(self) -> bool:
        return all(
            d.cantidad_recibida >= d.cantidad
            for d in self.detalles.all()
        )
