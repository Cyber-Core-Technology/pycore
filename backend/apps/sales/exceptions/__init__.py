from rest_framework import status


class SalesException(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message="Error en módulo de ventas"):
        self.message = message
        super().__init__(message)


class VentaNotFoundException(SalesException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Venta no encontrada"):
        super().__init__(message)


class VentaInvalidStateException(SalesException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="Estado de venta inválido para esta operación"):
        super().__init__(message)


class VentaFacturadaException(SalesException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="No se puede cancelar una venta ya facturada"):
        super().__init__(message)


class StockInsuficienteException(SalesException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="Stock insuficiente para uno o más productos"):
        super().__init__(message)


class CreditoInsuficienteException(SalesException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="El cliente no tiene crédito disponible suficiente"):
        super().__init__(message)


class PromocionInvalidaException(SalesException):
    def __init__(self, message="La promoción no es válida o no está vigente"):
        super().__init__(message)


class DevolucionNotFoundException(SalesException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Devolución no encontrada"):
        super().__init__(message)


class DevolucionInvalidaException(SalesException):
    def __init__(self, message="La devolución no es válida"):
        super().__init__(message)


class ProductoNoActivoException(SalesException):
    def __init__(self, message="Uno o más productos no están activos"):
        super().__init__(message)
