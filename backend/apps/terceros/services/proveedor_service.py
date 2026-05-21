from apps.terceros.repositories import ProveedorRepository
from apps.terceros.exceptions import TerceroNoEncontradoException, CodigoDuplicadoException

repo = ProveedorRepository()


class ProveedorService:

    def listar(self, empresa):
        return repo.get_all(empresa)

    def buscar(self, empresa, q):
        return repo.buscar(empresa, q)

    def obtener(self, empresa, pk):
        obj = repo.get_by_id(empresa, pk)
        if not obj:
            raise TerceroNoEncontradoException()
        return obj

    def crear(self, empresa, data):
        codigo = data.get('codigo')
        if codigo and repo.get_by_codigo(empresa, codigo):
            raise CodigoDuplicadoException()
        return repo.crear(empresa, data)

    def actualizar(self, empresa, pk, data):
        obj = self.obtener(empresa, pk)
        codigo = data.get('codigo')
        if codigo and codigo != obj.codigo:
            if repo.get_by_codigo(empresa, codigo):
                raise CodigoDuplicadoException()
        return repo.actualizar(obj, data)

    def eliminar(self, empresa, pk):
        obj = self.obtener(empresa, pk)
        repo.soft_delete(obj)
