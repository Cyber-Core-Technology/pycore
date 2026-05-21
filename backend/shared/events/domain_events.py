class DomainEvents:
    """
    Catálogo centralizado de todos los eventos de dominio del sistema.
    Convención: <entidad>.<accion> en snake_case.

    REGLA: Cualquier evento nuevo debe registrarse aquí antes de usarse.
    """

    # ==========================================
    # VENTAS
    # ==========================================
    VENTA_CREADA         = 'venta.creada'
    VENTA_ACTUALIZADA    = 'venta.actualizada'
    VENTA_CANCELADA      = 'venta.cancelada'
    VENTA_PAGADA         = 'venta.pagada'
    DEVOLUCION_CREADA    = 'devolucion.creada'
    DEVOLUCION_PROCESADA = 'devolucion.procesada'

    # ==========================================
    # COMPRAS
    # ==========================================
    COMPRA_CREADA    = 'compra.creada'
    COMPRA_ENVIADA   = 'compra.enviada'
    COMPRA_RECIBIDA  = 'compra.recibida'      # → dispara entrada de inventario
    COMPRA_CANCELADA = 'compra.cancelada'

    # ==========================================
    # INVENTARIO
    # ==========================================
    STOCK_ACTUALIZADO  = 'stock.actualizado'
    STOCK_BAJO         = 'stock.bajo'          # → dispara alerta a compras
    MOVIMIENTO_CREADO  = 'movimiento.creado'
    PRODUCTO_CREADO    = 'producto.creado'
    PRODUCTO_ACTUALIZADO = 'producto.actualizado'

    # ==========================================
    # FINANCIERO
    # ==========================================
    PAGO_REGISTRADO       = 'pago.registrado'
    CUENTA_COBRAR_CREADA    = 'cuenta_cobrar.creada'   # → desde venta a crédito
    CUENTA_COBRAR_PAGADA    = 'cuenta_cobrar.pagada'
    CUENTA_COBRAR_VENCIDA   = 'cuenta_cobrar.vencida'
    CUENTA_COBRAR_CANCELADA = 'cuenta_cobrar.cancelada'
    CUENTA_PAGAR_CREADA     = 'cuenta_pagar.creada'    # → desde compra recibida
    CUENTA_PAGAR_PAGADA     = 'cuenta_pagar.pagada'
    CUENTA_PAGAR_CANCELADA  = 'cuenta_pagar.cancelada'
    GASTO_REGISTRADO      = 'gasto.registrado'

    # ==========================================
    # AUTENTICACIÓN
    # ==========================================
    USUARIO_CREADO      = 'usuario.creado'
    USUARIO_LOGIN       = 'usuario.login'
    USUARIO_LOGOUT      = 'usuario.logout'
    USUARIO_BLOQUEADO   = 'usuario.bloqueado'

    # ==========================================
    # RRHH
    # ==========================================
    COLABORADOR_CREADO     = 'colaborador.creado'
    ASISTENCIA_REGISTRADA  = 'asistencia.registrada'

    # ==========================================
    # EMPRESA / CONFIGURACIÓN
    # ==========================================
    EMPRESA_TEMA_ACTUALIZADO = 'empresa.tema_actualizado'

    # ==========================================
    # SISTEMA
    # ==========================================
    ERROR_CRITICO = 'sistema.error_critico'
