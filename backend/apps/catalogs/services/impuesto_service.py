from apps.catalogs.repositories import ImpuestoRepository
from apps.catalogs.exceptions import CatalogoNoEncontradoException, CodigoDuplicadoException

repo = ImpuestoRepository()


class ImpuestoService:

    def listar(self, empresa, todos=False):
        return repo.get_all(empresa, todos=todos)

    def obtener(self, empresa, pk):
        obj = repo.get_by_id(empresa, pk)
        if not obj:
            raise CatalogoNoEncontradoException()
        return obj

    def crear(self, empresa, data):
        if repo.get_by_codigo(empresa, data.get('codigo', '')):
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
