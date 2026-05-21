from apps.catalogs.models import Impuesto


class ImpuestoRepository:

    def get_all(self, empresa, todos=False):
        qs = Impuesto.objects.filter(empresa=empresa)
        if not todos:
            qs = qs.filter(activo=True)
        return qs

    def get_by_id(self, empresa, pk):
        try:
            return Impuesto.objects.get(id=pk, empresa=empresa)
        except Impuesto.DoesNotExist:
            return None

    def get_by_codigo(self, empresa, codigo):
        try:
            return Impuesto.objects.get(empresa=empresa, codigo=codigo)
        except Impuesto.DoesNotExist:
            return None

    def crear(self, empresa, data):
        return Impuesto.objects.create(empresa=empresa, **data)

    def actualizar(self, impuesto, data):
        for campo, valor in data.items():
            setattr(impuesto, campo, valor)
        impuesto.save()
        return impuesto

    def soft_delete(self, impuesto):
        impuesto.activo = False
        impuesto.save(update_fields=['activo'])
