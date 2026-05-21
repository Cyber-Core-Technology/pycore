from django.db import models
from apps.terceros.models import Cliente


class ClienteRepository:

    def get_all(self, empresa):
        return Cliente.objects.filter(empresa=empresa).order_by('activo', 'nombre_comercial')

    def get_by_id(self, empresa, pk):
        try:
            return Cliente.objects.get(id=pk, empresa=empresa)
        except Cliente.DoesNotExist:
            return None

    def get_by_codigo(self, empresa, codigo):
        try:
            return Cliente.objects.get(empresa=empresa, codigo=codigo, activo=True)
        except Cliente.DoesNotExist:
            return None

    def buscar(self, empresa, q):
        return Cliente.objects.filter(
            empresa=empresa,
        ).filter(
            models.Q(nombre_comercial__icontains=q) |
            models.Q(rfc__icontains=q) |
            models.Q(codigo__icontains=q) |
            models.Q(email__icontains=q)
        )

    def crear(self, empresa, data):
        return Cliente.objects.create(empresa=empresa, **data)

    def actualizar(self, cliente, data):
        for campo, valor in data.items():
            setattr(cliente, campo, valor)
        cliente.save()
        return cliente

    def soft_delete(self, cliente):
        cliente.activo = False
        cliente.save(update_fields=['activo'])
