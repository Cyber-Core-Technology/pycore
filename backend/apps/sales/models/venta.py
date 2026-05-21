import uuid
from django.db import models


class Venta(models.Model):
    """
    Aggregate Root: Venta
    cliente es NULL para ventas de mostrador.
    promocion es NULL cuando no aplica ninguna promoción.
    saldo_pendiente > 0 solo cuando metodo_pago = 'credito'.
    """

    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('cancelado', 'Cancelado'),
        ('pagado', 'Pagado'),
    ]

    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta_debito', 'Tarjeta de Débito'),
        ('tarjeta_credito', 'Tarjeta de Crédito'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('credito', 'Crédito'),
        ('otro', 'Otro'),
    ]

    id_venta = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    folio = models.CharField(max_length=50)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='ventas',
    )

    # Cliente opcional — NULL = venta de mostrador
    cliente = models.ForeignKey(
        'terceros.Cliente',
        on_delete=models.SET_NULL,
        related_name='ventas',
        null=True, blank=True,
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.PROTECT,
        related_name='ventas',
    )
    vendedor = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        related_name='ventas_realizadas',
    )
    promocion = models.ForeignKey(
        'sales.Promocion',
        on_delete=models.SET_NULL,
        related_name='ventas',
        null=True, blank=True,
    )

    fecha_venta = models.DateTimeField(auto_now_add=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impuestos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    monto_recibido = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Monto entregado por el cliente. Solo aplica para pagos en efectivo.'
    )
    cambio = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Cambio devuelto al cliente (monto_recibido - total).'
    )
    saldo_pendiente = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Facturación — solo relevante para negocios formales
    requiere_factura = models.BooleanField(default=False)
    facturado = models.BooleanField(default=False)
    uuid_factura = models.UUIDField(null=True, blank=True)

    notas = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    # Campos offline
    offline_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    origen = models.CharField(max_length=10, choices=[('online', 'Online'), ('offline', 'Offline')], default='online')
    sincronizado_at = models.DateTimeField(null=True, blank=True)
    conflicto = models.BooleanField(default=False)
    conflicto_detalle = models.TextField(blank=True, default='')

    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='ventas_creadas',
    )
    updated_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='updated_by',
        related_name='ventas_actualizadas',
        null=True, blank=True,
    )

    class Meta:
        db_table = 'ventas'
        ordering = ['-fecha_venta']
        unique_together = [('empresa', 'folio')]
        indexes = [
            models.Index(fields=['empresa', 'fecha_venta']),
            models.Index(fields=['sucursal', 'fecha_venta']),
            models.Index(fields=['cliente']),
            models.Index(fields=['estado']),
            models.Index(fields=['empresa', 'folio']),
        ]

    def __str__(self):
        return f"Venta {self.folio} — ${self.total}"

    def puede_cancelarse(self) -> bool:
        return self.estado == 'activo' and not self.facturado

    def es_a_credito(self) -> bool:
        return self.metodo_pago == 'credito'

    def esta_pagada(self) -> bool:
        return self.saldo_pendiente == 0 or self.estado == 'pagado'

    def calcular_utilidad(self):
        return sum(
            (d.total - (d.costo_total or 0))
            for d in self.detalles.all()
        )
