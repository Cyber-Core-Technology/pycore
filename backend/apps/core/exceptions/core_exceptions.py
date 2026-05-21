class TenantNotFoundException(Exception):
    """Se lanza cuando no se encuentra el tenant en el request."""
    pass

class TenantInactiveException(Exception):
    """Se lanza cuando el tenant existe pero está inactivo."""
    pass

class EmpresaAlreadyExistsException(Exception):
    """Se lanza cuando se intenta crear una empresa con slug duplicado."""
    pass

class ConfiguracionNotFoundException(Exception):
    """Se lanza cuando una empresa no tiene configuración registrada."""
    pass
