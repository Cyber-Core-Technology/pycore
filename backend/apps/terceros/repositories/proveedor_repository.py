from django.db.models import Q
from apps.terceros.models import Proveedor


class ProveedorRepository:

    def get_all(self, empresa):
        return Proveedor.objects.filter(empresa=empresa, activo=True).order_by('nombre_comercial')

    def get_by_id(self, empresa, pk):
        try:
            return Proveedor.objects.get(id=pk, empresa=empresa)
        except Proveedor.DoesNotExist:
            return None

    def get_by_codigo(self, empresa, codigo):
        try:
            return Proveedor.objects.get(empresa=empresa, codigo=codigo)
        except Proveedor.DoesNotExist:
            return None

    def buscar(self, empresa, q):
        return Proveedor.objects.filter(
            empresa=empresa,
            activo=True,
        ).filter(
            Q(nombre_comercial__icontains=q) |
            Q(rfc__icontains=q) |
            Q(codigo__icontains=q) |
            Q(contacto_principal__icontains=q)
        )

    def crear(self, empresa, data):
        return Proveedor.objects.create(empresa=empresa, **data)

    def actualizar(self, proveedor, data):
        for campo, valor in data.items():
            setattr(proveedor, campo, valor)
        proveedor.save()
        return proveedor

    def soft_delete(self, proveedor):
        proveedor.activo = False
        proveedor.save(update_fields=['activo'])
