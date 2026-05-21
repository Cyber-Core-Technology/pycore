from apps.core.models import Empresa, Sucursal, Configuracion


class EmpresaRepository:

    @staticmethod
    def get_all():
        return Empresa.objects.filter(activo=True)

    @staticmethod
    def get_by_id(id_empresa):
        try:
            return Empresa.objects.get(id_empresa=id_empresa, activo=True)
        except Empresa.DoesNotExist:
            return None

    @staticmethod
    def get_by_slug(slug):
        try:
            return Empresa.objects.get(slug=slug, activo=True)
        except Empresa.DoesNotExist:
            return None

    @staticmethod
    def create(data):
        return Empresa.objects.create(**data)

    @staticmethod
    def update(empresa, data):
        for field, value in data.items():
            setattr(empresa, field, value)
        empresa.save()
        return empresa

    @staticmethod
    def soft_delete(empresa):
        empresa.activo = False
        empresa.save()
        return empresa


class SucursalRepository:

    @staticmethod
    def get_by_empresa(empresa):
        return Sucursal.objects.filter(empresa=empresa, activo=True)

    @staticmethod
    def get_by_id(id_sucursal):
        try:
            return Sucursal.objects.get(id_sucursal=id_sucursal, activo=True)
        except Sucursal.DoesNotExist:
            return None

    @staticmethod
    def create(empresa, data):
        return Sucursal.objects.create(empresa=empresa, **data)

    @staticmethod
    def update_sucursal(sucursal, data):
        for field, value in data.items():
            setattr(sucursal, field, value)
        sucursal.save()
        return sucursal

    @staticmethod
    def soft_delete_sucursal(sucursal):
        sucursal.activo = False
        sucursal.save()
