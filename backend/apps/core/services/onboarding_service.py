from apps.core.services.empresa_service import EmpresaService


class OnboardingService:
    """
    Orquesta el proceso completo de alta de una nueva empresa.
    Crea empresa + configuración + sucursal principal en una sola operación.
    """

    @staticmethod
    def registrar_empresa(data):
        empresa = EmpresaService.crear(data)
        return empresa
