from django.db.models import Q
from typing import Optional
from apps.inventory.models import Producto, VarianteProducto


class ProductoRepository:

    def get_all(self, empresa):
        return (
            Producto.objects
            .filter(empresa=empresa, activo=True)
            .select_related('categoria', 'unidad_medida', 'impuesto')
            .order_by('nombre')
        )

    def get_by_id(self, empresa, pk):
        try:
            return (
                Producto.objects
                .select_related('categoria', 'unidad_medida', 'impuesto')
                .prefetch_related('variantes')
                .get(id=pk, empresa=empresa)
            )
        except Producto.DoesNotExist:
            return None

    def get_by_sku(self, empresa, sku):
        try:
            return Producto.objects.get(empresa=empresa, sku=sku)
        except Producto.DoesNotExist:
            return None

    def buscar(self, empresa, q):
        return (
            Producto.objects
            .filter(
                empresa=empresa,
                activo=True
            )
            .filter(
                Q(nombre__icontains=q) |
                Q(sku__icontains=q) |
                Q(codigo_barras__icontains=q) |
                Q(codigo__icontains=q)
            )
            .select_related('categoria', 'unidad_medida')
        )

    def crear(self, empresa, data):
        return Producto.objects.create(empresa=empresa, **data)

    def actualizar(self, producto, data):
        for campo, valor in data.items():
            setattr(producto, campo, valor)
        producto.save()
        return producto

    def soft_delete(self, producto):
        producto.activo = False
        producto.save(update_fields=['activo'])

    # =========================================================
    # NUEVOS MÉTODOS PARA BÚSQUEDA POR CÓDIGO DE BARRAS
    # =========================================================

    def buscar_por_codigo_barras(
        self,
        empresa,
        codigo_barras: str,
    ) -> Optional[Producto]:
        """
        Busca un producto por código de barras dentro de la empresa.
        Retorna el primer producto activo que coincida exactamente.
        """
        return (
            Producto.objects
            .filter(
                empresa=empresa,
                codigo_barras=codigo_barras,
                activo=True,
            )
            .select_related('categoria', 'unidad_medida')
            .first()
        )

    def buscar_variante_por_codigo_barras(
        self,
        empresa,
        codigo_barras: str,
    ) -> Optional[VarianteProducto]:
        """
        Busca una variante por código de barras.
        Filtra por empresa a través del producto padre.
        """
        return (
            VarianteProducto.objects
            .filter(
                codigo_barras=codigo_barras,
                activo=True,
                producto__empresa=empresa,
                producto__activo=True,
            )
            .select_related(
                'producto',
                'producto__categoria',
                'producto__unidad_medida',
            )
            .first()
        )