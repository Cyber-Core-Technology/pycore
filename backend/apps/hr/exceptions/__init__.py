from shared.exceptions import NotFoundException, BusinessException


class ColaboradorNotFoundException(NotFoundException):
    def __init__(self):
        super().__init__("Colaborador no encontrado")


class AsistenciaNotFoundException(NotFoundException):
    def __init__(self):
        super().__init__("Asistencia no encontrada")


class ColaboradorInactivoException(BusinessException):
    def __init__(self):
        super().__init__("El colaborador no está activo")
