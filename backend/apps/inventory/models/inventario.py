import uuid
from django.db import models
from apps.core.models.empresa import Empresa
from apps.core.models.sucursal import Sucursal
from apps.inventory.models.producto import Producto
from apps.inventory.models.variante_producto import VarianteProducto


class Inventario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='inventarios'
    )
    producto = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name='inventarios'
    )
    variante = models.ForeignKey(
        VarianteProducto, on_delete=models.CASCADE,
        null=True, blank=True, related_name='inventarios'
    )
    sucursal = models.ForeignKey(
        Sucursal, on_delete=models.CASCADE, related_name='inventarios'
    )

    # Stock
    stock_actual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_reservado = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Costos
    costo_promedio = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Ubicación en almacén
    ubicacion = models.CharField(max_length=50, blank=True)
    pasillo = models.CharField(max_length=20, blank=True)
    estante = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_inventario'
        verbose_name = 'Inventario'
        verbose_name_plural = 'Inventario'
        unique_together = [('producto', 'variante', 'sucursal')]
        indexes = [
            models.Index(fields=['empresa', 'producto']),
            models.Index(fields=['empresa', 'sucursal']),
        ]

    def __str__(self):
        return f'{self.producto.nombre} @ {self.sucursal.nombre}'

    @property
    def stock_disponible(self):
        return self.stock_actual - self.stock_reservado

    @property
    def valor_inventario(self):
        return self.stock_actual * self.costo_promedio

    @property
    def bajo_minimo(self):
        return self.stock_actual <= self.producto.stock_minimo and self.producto.maneja_inventario
