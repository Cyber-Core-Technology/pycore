from decimal import Decimal
from django.db import transaction
from apps.inventory.repositories import MovimientoRepository, InventarioRepository
from apps.inventory.exceptions import StockInsuficienteException

mov_repo = MovimientoRepository()
inv_repo = InventarioRepository()


class MovimientoService:

    @transaction.atomic
    def registrar_entrada(self, empresa, sucursal, producto, cantidad,
                          costo_unitario=0, variante=None,
                          tipo_referencia='ajuste', referencia_id='', motivo=''):
        cantidad      = Decimal(str(cantidad))
        costo_unitario = Decimal(str(costo_unitario))

        inventario = inv_repo.get_or_create(empresa, producto, sucursal, variante)
        stock_antes = inventario.stock_actual

        if costo_unitario > 0:
            total_anterior = inventario.stock_actual * inventario.costo_promedio
            total_nuevo    = cantidad * costo_unitario
            nuevo_stock    = inventario.stock_actual + cantidad
            nuevo_costo    = (total_anterior + total_nuevo) / nuevo_stock if nuevo_stock > 0 else costo_unitario
        else:
            nuevo_stock = inventario.stock_actual + cantidad
            nuevo_costo = inventario.costo_promedio

        inv_repo.actualizar_stock(inventario, nuevo_stock, nuevo_costo)

        return mov_repo.crear({
            'empresa':        empresa,
            'folio':          mov_repo.generar_folio(empresa),
            'tipo_movimiento': 'entrada',
            'producto':       producto,
            'variante':       variante,
            'sucursal':       sucursal,
            'cantidad':       cantidad,
            'costo_unitario': costo_unitario,
            'costo_total':    cantidad * costo_unitario,
            'stock_antes':    stock_antes,
            'stock_despues':  nuevo_stock,
            'tipo_referencia': tipo_referencia,
            'referencia_id':  str(referencia_id),
            'motivo':         motivo,
        })

    @transaction.atomic
    def registrar_salida(self, empresa, sucursal, producto, cantidad,
                         variante=None, tipo_referencia='venta',
                         referencia_id='', motivo=''):
        cantidad = Decimal(str(cantidad))

        inventario = inv_repo.get_or_create(empresa, producto, sucursal, variante)

        if producto.maneja_inventario and inventario.stock_disponible < cantidad:
            raise StockInsuficienteException(
                detail=f'Stock disponible: {inventario.stock_disponible}, solicitado: {cantidad}'
            )

        stock_antes = inventario.stock_actual
        nuevo_stock = inventario.stock_actual - cantidad
        inv_repo.actualizar_stock(inventario, nuevo_stock)

        return mov_repo.crear({
            'empresa':        empresa,
            'folio':          mov_repo.generar_folio(empresa),
            'tipo_movimiento': 'salida',
            'producto':       producto,
            'variante':       variante,
            'sucursal':       sucursal,
            'cantidad':       cantidad,
            'costo_unitario': inventario.costo_promedio,
            'costo_total':    cantidad * inventario.costo_promedio,
            'stock_antes':    stock_antes,
            'stock_despues':  nuevo_stock,
            'tipo_referencia': tipo_referencia,
            'referencia_id':  str(referencia_id),
            'motivo':         motivo,
        })

    @transaction.atomic
    def registrar_ajuste(self, empresa, sucursal, producto, cantidad_nueva,
                         variante=None, motivo='Ajuste manual'):
        cantidad_nueva = Decimal(str(cantidad_nueva))

        inventario  = inv_repo.get_or_create(empresa, producto, sucursal, variante)
        stock_antes = inventario.stock_actual
        diferencia  = cantidad_nueva - stock_antes
        inv_repo.actualizar_stock(inventario, cantidad_nueva)

        return mov_repo.crear({
            'empresa':        empresa,
            'folio':          mov_repo.generar_folio(empresa),
            'tipo_movimiento': 'ajuste',
            'producto':       producto,
            'variante':       variante,
            'sucursal':       sucursal,
            'cantidad':       diferencia,
            'costo_unitario': inventario.costo_promedio,
            'costo_total':    abs(diferencia) * inventario.costo_promedio,
            'stock_antes':    stock_antes,
            'stock_despues':  cantidad_nueva,
            'tipo_referencia': 'ajuste',
            'motivo':         motivo,
        })
