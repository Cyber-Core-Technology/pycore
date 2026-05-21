from decimal import Decimal
from apps.sales.exceptions import (
    StockInsuficienteException,
    ProductoNoActivoException,
    DevolucionInvalidaException,
    PromocionInvalidaException,
    CreditoInsuficienteException,
)


class VentaValidator:

    @staticmethod
    def validar_items(items: list[dict], sucursal, empresa) -> None:
        """
        Valida cada ítem:
        - producto existe y está activo
        - stock suficiente en la sucursal (solo si maneja_inventario)
        - cantidad > 0
        - precio_unitario >= 0
        """
        from apps.inventory.models import Producto, Inventario

        for item in items:
            if Decimal(str(item.get('cantidad', 0))) <= 0:
                raise StockInsuficienteException(
                    f"La cantidad del producto {item.get('id_producto')} debe ser mayor a 0."
                )

            try:
                producto = Producto.objects.get(id=item['id_producto'])
            except Producto.DoesNotExist:
                raise ProductoNoActivoException(
                    f"Producto {item['id_producto']} no encontrado."
                )

            if not producto.activo:
                raise ProductoNoActivoException(
                    f"El producto '{producto.nombre}' no está activo."
                )

            if producto.maneja_inventario:
                from apps.inventory.models import VarianteProducto
                variante = None
                if item.get('id_variante'):
                    try:
                        variante = VarianteProducto.objects.get(
                            id=item['id_variante'], producto=producto
                        )
                    except VarianteProducto.DoesNotExist:
                        pass

                try:
                    inv = Inventario.objects.get(
                        producto=producto,
                        sucursal=sucursal,
                        empresa=empresa,
                        variante=variante,
                    )
                    cantidad_requerida = Decimal(str(item['cantidad']))
                    if inv.stock_actual < cantidad_requerida:
                        nombre = f"{producto.nombre} ({variante.nombre})" if variante else producto.nombre
                        raise StockInsuficienteException(
                            f"Stock insuficiente para '{nombre}'. "
                            f"Disponible: {inv.stock_actual}, "
                            f"Requerido: {cantidad_requerida}."
                        )
                except Inventario.DoesNotExist:
                    nombre = f"{producto.nombre} ({variante.nombre})" if variante else producto.nombre
                    raise StockInsuficienteException(
                        f"No hay registro de inventario para '{nombre}' "
                        f"en esta sucursal."
                    )

    @staticmethod
    def validar_credito_cliente(cliente, total: Decimal) -> None:
        """
        Valida que el cliente tenga crédito disponible suficiente.
        Solo se llama cuando metodo_pago == 'credito'.
        """
        if not cliente:
            raise CreditoInsuficienteException(
                "Las ventas a crédito requieren un cliente registrado."
            )
        if cliente.credito_disponible < total:
            raise CreditoInsuficienteException(
                f"Crédito disponible insuficiente. "
                f"Disponible: ${cliente.credito_disponible}, "
                f"Requerido: ${total}."
            )

    @staticmethod
    def validar_promocion(promocion, subtotal: Decimal) -> None:
        if not promocion.puede_aplicarse(subtotal):
            raise PromocionInvalidaException(
                f"La promoción '{promocion.nombre}' no puede aplicarse."
            )

    @staticmethod
    def validar_items_devolucion(venta, items: list[dict]) -> None:
        """
        Valida que cada ítem de devolución:
        - pertenezca a la venta original
        - no exceda la cantidad vendida
        """
        detalle_map = {d.id_detalle: d for d in venta.detalles.all()}

        for item in items:
            id_detalle_venta = item.get('id_detalle_venta')
            cantidad = Decimal(str(item.get('cantidad', 0)))

            if id_detalle_venta not in detalle_map:
                raise DevolucionInvalidaException(
                    f"El detalle {id_detalle_venta} no pertenece a esta venta."
                )

            detalle = detalle_map[id_detalle_venta]

            # Calcular cuánto ya fue devuelto de esta línea
            ya_devuelto = sum(
                dd.cantidad
                for dd in detalle.devoluciones.all()
            )
            disponible = detalle.cantidad - ya_devuelto

            if cantidad <= 0:
                raise DevolucionInvalidaException(
                    f"La cantidad a devolver para el detalle {id_detalle_venta} "
                    f"debe ser mayor a 0."
                )

            if cantidad > disponible:
                raise DevolucionInvalidaException(
                    f"Cantidad a devolver ({cantidad}) supera lo disponible "
                    f"({disponible}) para el detalle {id_detalle_venta}."
                )
