from rest_framework import status


class PurchasesException(Exception):
    """Excepción base del módulo de compras."""
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message="Error en módulo de compras"):
        self.message = message
        super().__init__(message)


class CompraNotFoundException(PurchasesException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Compra no encontrada"):
        super().__init__(message)


class CompraInvalidStateException(PurchasesException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="Estado de compra inválido para esta operación"):
        super().__init__(message)


class CompraEmptyDetallesException(PurchasesException):
    def __init__(self, message="La compra debe tener al menos un producto antes de confirmarse"):
        super().__init__(message)


class DetalleCompraNotFoundException(PurchasesException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Detalle de compra no encontrado"):
        super().__init__(message)


class RecepcionInvalidaException(PurchasesException):
    def __init__(self, message="Las cantidades recibidas no son válidas"):
        super().__init__(message)


class ProductoNoActivoException(PurchasesException):
    def __init__(self, message="Uno o más productos no están activos"):
        super().__init__(message)
