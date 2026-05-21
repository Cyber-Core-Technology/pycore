from django.db.models import QuerySet
from apps.sales.models import Venta


class VentaRepository:

    def get_by_id(self, id_venta: int, empresa) -> Venta | None:
        try:
            return Venta.objects.select_related(
                'cliente', 'sucursal', 'vendedor', 'promocion'
            ).get(
                id_venta=id_venta,
                empresa=empresa,
                deleted_at__isnull=True,
            )
        except Venta.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None) -> QuerySet:
        qs = Venta.objects.filter(
            empresa=empresa,
            deleted_at__isnull=True,
        ).select_related('cliente', 'sucursal', 'vendedor')

        if not filters:
            return qs

        if filters.get('estado'):
            estados = [e.strip() for e in filters['estado'].split(',') if e.strip()]
            if len(estados) == 1:
                qs = qs.filter(estado=estados[0])
            else:
                qs = qs.filter(estado__in=estados)
        if filters.get('cliente'):
            qs = qs.filter(cliente=filters['cliente'])
        if filters.get('sucursal'):
            qs = qs.filter(sucursal=filters['sucursal'])
        if filters.get('metodo_pago'):
            qs = qs.filter(metodo_pago=filters['metodo_pago'])
        if filters.get('fecha_desde'):
            qs = qs.filter(fecha_venta__date__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(fecha_venta__date__lte=filters['fecha_hasta'])

        return qs

    def create(self, **kwargs) -> Venta:
        return Venta.objects.create(**kwargs)

    def save(self, venta: Venta) -> Venta:
        venta.save()
        return venta

    def soft_delete(self, venta: Venta, usuario) -> Venta:
        from django.utils import timezone
        venta.deleted_at = timezone.now()
        venta.updated_by = usuario
        venta.save(update_fields=['deleted_at', 'updated_by', 'updated_at'])
        return venta

    def get_ultimo_folio_prefijo(self, empresa, prefijo: str) -> str | None:
        """Devuelve el folio más alto que empieza con el prefijo dado (ej. VEN-202603-)."""
        return (
            Venta.objects.filter(empresa=empresa, folio__startswith=prefijo)
            .order_by('-folio')
            .values_list('folio', flat=True)
            .first()
        )
