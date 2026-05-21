import uuid
from django.db import models
from apps.core.models.empresa import Empresa
from apps.core.models.sucursal import Sucursal
from apps.inventory.models.producto import Producto
from apps.inventory.models.variante_producto import VarianteProducto

TIPO_MOVIMIENTO = [
    ('entrada', 'Entrada'),
    ('salida', 'Salida'),
    ('ajuste', 'Ajuste'),
    ('traspaso_salida', 'Traspaso Salida'),
    ('traspaso_entrada', 'Traspaso Entrada'),
]

TIPO_REFERENCIA = [
    ('compra', 'Compra'),
    ('venta', 'Venta'),
    ('ajuste', 'Ajuste Manual'),
    ('traspaso', 'Traspaso'),
    ('devolucion', 'Devolución'),
    ('cancelacion_venta', 'Cancelación de Venta'),
    ('inicial', 'Carga Inicial'),
]


class MovimientoInventario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='movimientos_inventario'
    )
    folio = models.CharField(max_length=50)

    tipo_movimiento = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO)

    producto = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name='movimientos'
    )
    variante = models.ForeignKey(
        VarianteProducto, on_delete=models.PROTECT,
        null=True, blank=True, related_name='movimientos'
    )
    sucursal = models.ForeignKey(
        Sucursal, on_delete=models.PROTECT, related_name='movimientos_inventario'
    )

    # Cantidad y costo
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    costo_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Stock resultante (snapshot)
    stock_antes = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_despues = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Referencias
    referencia_id = models.CharField(max_length=100, blank=True)
    tipo_referencia = models.CharField(max_length=30, choices=TIPO_REFERENCIA, blank=True)
    motivo = models.CharField(max_length=255, blank=True)
    observaciones = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_movimientos'
        verbose_name = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'
        ordering = ['-created_at']
        unique_together = [('empresa', 'folio')]
        indexes = [
            models.Index(fields=['empresa', 'producto']),
            models.Index(fields=['empresa', 'tipo_movimiento']),
            models.Index(fields=['empresa', 'folio']),
        ]

    def __str__(self):
        return f'{self.folio} - {self.tipo_movimiento} {self.cantidad} {self.producto.nombre}'
