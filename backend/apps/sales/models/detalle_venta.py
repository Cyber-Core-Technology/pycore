from django.db import models


class DetalleVenta(models.Model):
    """
    Línea de producto dentro de una Venta.
    costo_unitario y costo_total son snapshot del costo_promedio
    del inventario al momento de la venta — para calcular utilidad.
    """

    id_detalle = models.AutoField(primary_key=True)

    venta = models.ForeignKey(
        'sales.Venta',
        on_delete=models.CASCADE,
        related_name='detalles',
    )
    producto = models.ForeignKey(
        'inventory.Producto',
        on_delete=models.PROTECT,
        related_name='detalles_venta',
    )
    variante = models.ForeignKey(
        'inventory.VarianteProducto',
        on_delete=models.PROTECT,
        related_name='detalles_venta',
        null=True, blank=True,
    )

    cantidad = models.DecimalField(max_digits=12, decimal_places=4)

    # Snapshot de precios al momento de la venta
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    impuesto_tasa = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    impuesto_monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    total = models.DecimalField(max_digits=12, decimal_places=2)

    # Snapshot de costo para cálculo de utilidad
    costo_unitario = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    costo_total = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    notas = models.CharField(
        max_length=255, blank=True, default='',
        help_text='Nota libre por línea de venta. Ej: "sin sal", "mitad cocido".'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'detalle_ventas'
        ordering = ['id_detalle']

    def __str__(self):
        return f"Detalle #{self.id_detalle} — {self.producto_id} x {self.cantidad}"

    @property
    def utilidad(self):
        if self.costo_total is not None:
            return self.total - self.costo_total
        return None
