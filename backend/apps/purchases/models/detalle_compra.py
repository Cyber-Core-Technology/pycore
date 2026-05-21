from django.db import models


class DetalleCompra(models.Model):

    id_detalle = models.AutoField(primary_key=True)

    compra = models.ForeignKey(
        'purchases.Compra',
        on_delete=models.CASCADE,
        related_name='detalles',
    )
    producto = models.ForeignKey(
        'inventory.Producto',
        on_delete=models.PROTECT,
        related_name='detalles_compra',
    )
    variante = models.ForeignKey(
        'inventory.VarianteProducto',
        on_delete=models.PROTECT,
        related_name='detalles_compra',
        null=True,
        blank=True,
    )

    cantidad = models.DecimalField(max_digits=12, decimal_places=4)
    cantidad_recibida = models.DecimalField(max_digits=12, decimal_places=4, default=0)

    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    impuesto_tasa = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    impuesto_monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    total = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'detalle_compras'
        ordering = ['id_detalle']

    def __str__(self):
        return f"Detalle #{self.id_detalle} — Producto {self.producto_id} x {self.cantidad}"

    @property
    def cantidad_pendiente(self):
        return max(self.cantidad - self.cantidad_recibida, 0)

    @property
    def esta_completamente_recibida(self) -> bool:
        return self.cantidad_recibida >= self.cantidad
