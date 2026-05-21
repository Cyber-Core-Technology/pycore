from apps.catalogs.models import UnidadMedida


class UnidadMedidaRepository:

    def get_all(self, empresa, todos=False):
        qs = UnidadMedida.objects.filter(empresa=empresa)
        if not todos:
            qs = qs.filter(activo=True)
        return qs

    def get_by_id(self, empresa, pk):
        try:
            return UnidadMedida.objects.get(id=pk, empresa=empresa)
        except UnidadMedida.DoesNotExist:
            return None

    def get_by_codigo(self, empresa, codigo):
        try:
            return UnidadMedida.objects.get(empresa=empresa, codigo=codigo)
        except UnidadMedida.DoesNotExist:
            return None

    def crear(self, empresa, data):
        return UnidadMedida.objects.create(empresa=empresa, **data)

    def actualizar(self, unidad, data):
        for campo, valor in data.items():
            setattr(unidad, campo, valor)
        unidad.save()
        return unidad

    def soft_delete(self, unidad):
        unidad.activo = False
        unidad.save(update_fields=['activo'])
