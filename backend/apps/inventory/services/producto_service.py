from apps.inventory.repositories import ProductoRepository
from apps.inventory.exceptions import ProductoNoEncontradoException, SKUDuplicadoException

repo = ProductoRepository()


class ProductoService:

    def listar(self, empresa):
        return repo.get_all(empresa)

    def buscar(self, empresa, q):
        return repo.buscar(empresa, q)

    def obtener(self, empresa, pk):
        obj = repo.get_by_id(empresa, pk)
        if not obj:
            raise ProductoNoEncontradoException()
        return obj

    def crear(self, empresa, data):
        sku = data.get('sku')
        if sku and repo.get_by_sku(empresa, sku):
            raise SKUDuplicadoException()
        return repo.crear(empresa, data)

    def actualizar(self, empresa, pk, data):
        obj = self.obtener(empresa, pk)
        sku = data.get('sku')
        if sku and sku != obj.sku and repo.get_by_sku(empresa, sku):
            raise SKUDuplicadoException()
        return repo.actualizar(obj, data)

    def eliminar(self, empresa, pk):
        obj = self.obtener(empresa, pk)
        repo.soft_delete(obj)
