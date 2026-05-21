from rest_framework.exceptions import APIException
from rest_framework import status


class ProductoNoEncontradoException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Producto no encontrado.'


class StockInsuficienteException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Stock insuficiente para realizar la operación.'


class SKUDuplicadoException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Ya existe un producto con ese SKU en esta empresa.'


class InventarioNoEncontradoException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Registro de inventario no encontrado.'
