from django.db.models import QuerySet
from apps.sales.models import Devolucion


class DevolucionRepository:

    def get_by_id(self, id_devolucion: int, empresa) -> Devolucion | None:
        try:
            return Devolucion.objects.select_related(
                'venta', 'sucursal'
            ).get(
                id_devolucion=id_devolucion,
                empresa=empresa,
            )
        except Devolucion.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None) -> QuerySet:
        qs = Devolucion.objects.filter(
            empresa=empresa,
        ).select_related('venta', 'sucursal')

        if not filters:
            return qs

        if filters.get('id_venta'):
            qs = qs.filter(venta=filters['id_venta'])
        if filters.get('fecha_desde'):
            qs = qs.filter(fecha_devolucion__date__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(fecha_devolucion__date__lte=filters['fecha_hasta'])

        return qs

    def create(self, **kwargs) -> Devolucion:
        return Devolucion.objects.create(**kwargs)

    def save(self, devolucion: Devolucion) -> Devolucion:
        devolucion.save()
        return devolucion

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            Devolucion.objects.filter(empresa=empresa)
            .order_by('-id_devolucion')
            .values_list('folio', flat=True)
            .first()
        )
