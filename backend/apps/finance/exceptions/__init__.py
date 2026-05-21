from rest_framework import status


class FinanceException(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message="Error en módulo de finanzas"):
        self.message = message
        super().__init__(message)


class CuentaBancariaNotFoundException(FinanceException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Cuenta bancaria no encontrada"):
        super().__init__(message)


class CxCNotFoundException(FinanceException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Cuenta por cobrar no encontrada"):
        super().__init__(message)


class CxPNotFoundException(FinanceException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Cuenta por pagar no encontrada"):
        super().__init__(message)


class CxCYaExisteException(FinanceException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="Esta venta ya tiene una CxC registrada"):
        super().__init__(message)


class CxCCanceladaException(FinanceException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="La cuenta por cobrar está cancelada"):
        super().__init__(message)


class CxPCanceladaException(FinanceException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="La cuenta por pagar está cancelada"):
        super().__init__(message)


class PagoExcedeSaldoException(FinanceException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="El monto del pago excede el saldo pendiente"):
        super().__init__(message)


class GastoNotFoundException(FinanceException):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message="Gasto no encontrado"):
        super().__init__(message)


class SaldoInsuficienteException(FinanceException):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message="Saldo insuficiente en la cuenta bancaria"):
        super().__init__(message)
