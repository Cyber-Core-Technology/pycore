from django.db.models import QuerySet
from apps.purchases.models import Compra


class CompraRepository:
    """
    CRUD básico para Compra. Sin lógica de negocio.
    """

    def get_by_id(self, id_compra: int, empresa) -> Compra | None:
        try:
            return Compra.objects.get(
                id_compra=id_compra,
                empresa=empresa,
                deleted_at__isnull=True,
            )
        except Compra.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None) -> QuerySet:
        """
        Filtra por: estado, proveedor, sucursal, fecha_desde, fecha_hasta.
        """
        qs = Compra.objects.filter(
            empresa=empresa,
            deleted_at__isnull=True,
        ).select_related('proveedor', 'sucursal', 'created_by')

        if not filters:
            return qs

        if filters.get('estado'):
            qs = qs.filter(estado=filters['estado'])
        if filters.get('id_proveedor'):
            qs = qs.filter(proveedor=filters['id_proveedor'])
        if filters.get('id_sucursal'):
            qs = qs.filter(sucursal=filters['id_sucursal'])
        if filters.get('fecha_desde'):
            qs = qs.filter(fecha_compra__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(fecha_compra__lte=filters['fecha_hasta'])

        return qs

    def create(self, **kwargs) -> Compra:
        return Compra.objects.create(**kwargs)

    def save(self, compra: Compra) -> Compra:
        compra.save()
        return compra

    def soft_delete(self, compra: Compra, usuario) -> Compra:
        from django.utils import timezone
        compra.deleted_at = timezone.now()
        compra.updated_by = usuario
        compra.save(update_fields=['deleted_at', 'updated_by', 'updated_at'])
        return compra

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            Compra.objects.filter(empresa=empresa)
            .order_by('-id_compra')
            .values_list('folio', flat=True)
            .first()
        )
