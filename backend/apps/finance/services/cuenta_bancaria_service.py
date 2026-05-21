import logging
from apps.finance.repositories import CuentaBancariaRepository
from apps.finance.exceptions import CuentaBancariaNotFoundException

logger = logging.getLogger(__name__)


class CuentaBancariaService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = CuentaBancariaRepository()

    def listar(self):
        return self.repo.list_by_empresa(self.empresa)

    def obtener(self, id_cuenta: int):
        cuenta = self.repo.get_by_id(id_cuenta, self.empresa)
        if not cuenta:
            raise CuentaBancariaNotFoundException()
        return cuenta

    def crear(self, data: dict):
        return self.repo.create(
            empresa=self.empresa,
            created_by=self.usuario,
            **data,
        )

    def actualizar_saldo(self, cuenta, delta):
        """Delta positivo = ingreso, negativo = egreso."""
        cuenta.saldo_actual += delta
        self.repo.save(cuenta)
        return cuenta
