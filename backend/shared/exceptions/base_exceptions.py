from rest_framework import status


class BaseAppException(Exception):
    """Excepción base del sistema PyCore."""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message = "Error interno del servidor"

    def __init__(self, message=None):
        self.message = message or self.default_message
        super().__init__(self.message)

    def __str__(self):
        return self.message


class BusinessException(BaseAppException):
    """Error de regla de negocio — algo no está permitido."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "Operación no permitida"


class NotFoundException(BaseAppException):
    """Recurso no encontrado."""
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "Recurso no encontrado"


class ValidationException(BaseAppException):
    """Error de validación de datos de entrada."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "Datos inválidos"


class PermissionException(BaseAppException):
    """Sin permisos para realizar la operación."""
    status_code = status.HTTP_403_FORBIDDEN
    default_message = "Sin permisos para esta operación"


class ConflictException(BaseAppException):
    """Conflicto con el estado actual del recurso."""
    status_code = status.HTTP_409_CONFLICT
    default_message = "Conflicto con el estado actual"


class ExternalServiceException(BaseAppException):
    """Error al comunicarse con un servicio externo."""
    status_code = status.HTTP_502_BAD_GATEWAY
    default_message = "Error en servicio externo"
