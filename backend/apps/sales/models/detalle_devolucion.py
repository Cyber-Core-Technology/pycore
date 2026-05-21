from django.db import models


class DetalleDevolucion(models.Model):
    """
    Línea de producto devuelto.
    detalle_venta referencia la línea original de la venta
    para validar que el producto y precio son correctos.
    """

    id_detalle = models.AutoField(primary_key=True)

    devolucion = models.ForeignKey(
        'sales.Devolucion',
        on_delete=models.CASCADE,
        related_name='detalles',
    )
    detalle_venta = models.ForeignKey(
        'sales.DetalleVenta',
        on_delete=models.PROTECT,
        related_name='devoluciones',
    )
    producto = models.ForeignKey(
        'inventory.Producto',
        on_delete=models.PROTECT,
        related_name='detalles_devolucion',
    )
    variante = models.ForeignKey(
        'inventory.VarianteProducto',
        on_delete=models.PROTECT,
        related_name='detalles_devolucion',
        null=True, blank=True,
    )

    cantidad = models.DecimalField(max_digits=12, decimal_places=4)

    # Precios tomados de la venta original
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto_monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'detalle_devoluciones'
        ordering = ['id_detalle']

    def __str__(self):
        return f"DetalleDev #{self.id_detalle} — {self.producto_id} x {self.cantidad}"
