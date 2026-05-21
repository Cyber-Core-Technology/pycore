from decimal import Decimal
from apps.purchases.exceptions import (
    ProductoNoActivoException,
    RecepcionInvalidaException,
)


class CompraValidator:

    @staticmethod
    def validar_items(items: list[dict]) -> None:
        """
        Valida coherencia de cada ítem antes de persistir:
        - cantidad > 0
        - precio_unitario >= 0
        - producto existe y está activo
        - variante pertenece al producto si se especifica
        """
        from apps.inventory.models import Producto, VarianteProducto

        for item in items:
            if Decimal(str(item.get('cantidad', 0))) <= 0:
                raise RecepcionInvalidaException(
                    f"La cantidad del producto {item.get('id_producto')} debe ser mayor a 0."
                )
            if Decimal(str(item.get('precio_unitario', 0))) < 0:
                raise RecepcionInvalidaException(
                    f"El precio unitario del producto {item.get('id_producto')} no puede ser negativo."
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

            if item.get('id_variante'):
                if not VarianteProducto.objects.filter(
                    id=item['id_variante'],
                    producto=producto,
                ).exists():
                    raise RecepcionInvalidaException(
                        f"La variante {item['id_variante']} no pertenece al producto '{producto.nombre}'."
                    )

    @staticmethod
    def validar_cantidades_recepcion(detalles_existentes, items_recibidos: list[dict]) -> None:
        """
        Valida que las cantidades a recibir no superen lo pendiente en cada detalle.
        """
        detalle_map = {d.id_detalle: d for d in detalles_existentes}

        for item in items_recibidos:
            id_detalle = item.get('id_detalle')
            cantidad_a_recibir = Decimal(str(item.get('cantidad_recibida', 0)))

            if id_detalle not in detalle_map:
                raise RecepcionInvalidaException(
                    f"El detalle {id_detalle} no pertenece a esta compra."
                )

            detalle = detalle_map[id_detalle]
            nueva_total = detalle.cantidad_recibida + cantidad_a_recibir

            if nueva_total > detalle.cantidad:
                raise RecepcionInvalidaException(
                    f"La cantidad a recibir ({cantidad_a_recibir}) para el detalle "
                    f"{id_detalle} supera la cantidad pendiente ({detalle.cantidad_pendiente})."
                )

            if cantidad_a_recibir <= 0:
                raise RecepcionInvalidaException(
                    f"La cantidad a recibir para el detalle {id_detalle} debe ser mayor a 0."
                )
