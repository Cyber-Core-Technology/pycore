from apps.catalogs.models import Categoria


class CategoriaRepository:

    def get_all(self, empresa, todos=False):
        qs = Categoria.objects.filter(empresa=empresa).select_related('padre')
        if not todos:
            qs = qs.filter(activo=True)
        return qs

    def get_by_id(self, empresa, pk):
        try:
            return Categoria.objects.get(id=pk, empresa=empresa)
        except Categoria.DoesNotExist:
            return None

    def get_by_codigo(self, empresa, codigo):
        try:
            return Categoria.objects.get(empresa=empresa, codigo=codigo)
        except Categoria.DoesNotExist:
            return None

    def get_raices(self, empresa):
        return Categoria.objects.filter(empresa=empresa, padre=None, activo=True)

    def crear(self, empresa, data):
        return Categoria.objects.create(empresa=empresa, **data)

    def actualizar(self, categoria, data):
        for campo, valor in data.items():
            setattr(categoria, campo, valor)
        categoria.save()
        return categoria

    def soft_delete(self, categoria):
        categoria.activo = False
        categoria.save(update_fields=['activo'])

    def tiene_hijos_activos(self, categoria):
        return categoria.subcategorias.filter(activo=True).exists()
