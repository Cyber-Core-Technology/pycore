import uuid
from django.db import models
from apps.inventory.models.producto import Producto
from apps.catalogs.models.unidad_medida import UnidadMedida


class VarianteProducto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producto = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name='variantes'
    )
    nombre = models.CharField(max_length=100)
    sku = models.CharField(max_length=50, blank=True)
    codigo_barras = models.CharField(max_length=50, blank=True)
    atributos = models.JSONField(default=dict, blank=True)

    # Unidad de medida específica de la variante (sobreescribe la del producto padre)
    # Si es tipo 'peso' o 'volumen', la cantidad en ventas/compras acepta decimales
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='variantes',
    )

    # Precios específicos (sobreescriben al producto padre si se definen)
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_variantes'
        verbose_name = 'Variante de Producto'
        verbose_name_plural = 'Variantes de Producto'

    def __str__(self):
        return f'{self.producto.nombre} - {self.nombre}'

    @property
    def precio_venta_efectivo(self):
        return self.precio_venta if self.precio_venta is not None else self.producto.precio_venta

    @property
    def precio_compra_efectivo(self):
        return self.precio_compra if self.precio_compra is not None else self.producto.precio_compra

    @property
    def unidad_medida_efectiva(self):
        """Unidad de la variante, o la del producto padre como fallback."""
        return self.unidad_medida or self.producto.unidad_medida

    @property
    def es_por_peso(self):
        """True si la cantidad se captura como decimal (productos a granel por peso)."""
        um = self.unidad_medida_efectiva
        return um is not None and um.tipo == 'peso'
