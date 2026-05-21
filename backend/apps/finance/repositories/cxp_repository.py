from apps.finance.models import CuentaPorPagar


class CxPRepository:

    def get_by_id(self, id_cxp: int, empresa) -> CuentaPorPagar | None:
        try:
            return CuentaPorPagar.objects.select_related(
                'proveedor', 'compra'
            ).get(id_cxp=id_cxp, empresa=empresa)
        except CuentaPorPagar.DoesNotExist:
            return None

    def get_by_compra(self, id_compra: int, empresa) -> CuentaPorPagar | None:
        try:
            return CuentaPorPagar.objects.get(
                compra=id_compra, empresa=empresa
            )
        except CuentaPorPagar.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = CuentaPorPagar.objects.filter(
            empresa=empresa
        ).select_related('proveedor', 'compra')

        if not filters:
            return qs

        if filters.get('estado'):
            qs = qs.filter(estado=filters['estado'])
        if filters.get('proveedor'):
            qs = qs.filter(proveedor=filters['proveedor'])
        if filters.get('vencidas'):
            from django.utils import timezone
            qs = qs.filter(
                estado__in=['pendiente', 'pagada_parcial'],
                fecha_vencimiento__lt=timezone.now().date(),
            )
        if filters.get('fecha_desde'):
            qs = qs.filter(fecha_emision__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(fecha_emision__lte=filters['fecha_hasta'])

        return qs

    def create(self, **kwargs) -> CuentaPorPagar:
        return CuentaPorPagar.objects.create(**kwargs)

    def save(self, cxp: CuentaPorPagar) -> CuentaPorPagar:
        cxp.save()
        return cxp

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            CuentaPorPagar.objects.filter(empresa=empresa)
            .order_by('-id_cxp')
            .values_list('folio', flat=True)
            .first()
        )
