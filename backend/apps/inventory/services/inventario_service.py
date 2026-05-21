from apps.inventory.repositories import InventarioRepository
from apps.inventory.exceptions import InventarioNoEncontradoException

repo = InventarioRepository()


class InventarioService:

    def listar_por_empresa(self, empresa):
        return repo.get_by_empresa(empresa)

    def listar_por_sucursal(self, empresa, sucursal):
        return repo.get_by_sucursal(empresa, sucursal)

    def stock_bajo_minimo(self, empresa):
        return [i for i in repo.get_by_empresa(empresa) if i.bajo_minimo]
