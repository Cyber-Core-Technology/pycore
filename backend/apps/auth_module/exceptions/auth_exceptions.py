from rest_framework.exceptions import APIException
from rest_framework import status


class CredencialesInvalidasException(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Credenciales inválidas.'
    default_code = 'credenciales_invalidas'


class UsuarioBloqueadoException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Usuario bloqueado temporalmente por múltiples intentos fallidos.'
    default_code = 'usuario_bloqueado'


class UsuarioInactivoException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'El usuario está inactivo.'
    default_code = 'usuario_inactivo'


class TokenInvalidoException(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Token inválido o expirado.'
    default_code = 'token_invalido'


class UsuarioYaExisteException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Ya existe un usuario con ese email o username.'
    default_code = 'usuario_ya_existe'


class PermisoInsuficienteException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'No tiene permisos para realizar esta acción.'
    default_code = 'permiso_insuficiente'
