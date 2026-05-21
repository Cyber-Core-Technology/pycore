from apps.finance.models import Gasto


class GastoRepository:

    def get_by_id(self, id_gasto: int, empresa) -> Gasto | None:
        try:
            return Gasto.objects.get(id_gasto=id_gasto, empresa=empresa)
        except Gasto.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = Gasto.objects.filter(empresa=empresa)
        if not filters:
            return qs
        if filters.get('categoria'):
            qs = qs.filter(categoria=filters['categoria'])
        if filters.get('fecha_desde'):
            qs = qs.filter(fecha_gasto__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(fecha_gasto__lte=filters['fecha_hasta'])
        return qs

    def create(self, **kwargs) -> Gasto:
        return Gasto.objects.create(**kwargs)

    def save(self, gasto: Gasto) -> Gasto:
        gasto.save()
        return gasto

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            Gasto.objects.filter(empresa=empresa)
            .order_by('-id_gasto')
            .values_list('folio', flat=True)
            .first()
        )
