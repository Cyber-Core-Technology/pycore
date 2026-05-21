from rest_framework.exceptions import APIException
from rest_framework import status


class CatalogoNoEncontradoException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Registro no encontrado.'
    default_code = 'no_encontrado'


class CodigoDuplicadoException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Ya existe un registro con ese código en esta empresa.'
    default_code = 'codigo_duplicado'


class CategoriaConHijosException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'No se puede eliminar una categoría que tiene subcategorías activas.'
    default_code = 'categoria_con_hijos'
