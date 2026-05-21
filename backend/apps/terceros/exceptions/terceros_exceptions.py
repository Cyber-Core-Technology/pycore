from rest_framework.exceptions import APIException
from rest_framework import status


class TerceroNoEncontradoException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Registro no encontrado.'
    default_code = 'no_encontrado'


class CodigoDuplicadoException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Ya existe un registro con ese código en esta empresa.'
    default_code = 'codigo_duplicado'


class CreditoInsuficienteException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'El cliente no tiene crédito disponible suficiente.'
    default_code = 'credito_insuficiente'
