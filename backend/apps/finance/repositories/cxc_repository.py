from apps.finance.models import CuentaPorCobrar


class CxCRepository:

    def get_by_id(self, id_cxc: int, empresa) -> CuentaPorCobrar | None:
        try:
            return CuentaPorCobrar.objects.select_related(
                'cliente', 'venta'
            ).get(id_cxc=id_cxc, empresa=empresa)
        except CuentaPorCobrar.DoesNotExist:
            return None

    def get_by_venta(self, id_venta: int, empresa) -> CuentaPorCobrar | None:
        try:
            return CuentaPorCobrar.objects.get(
                venta=id_venta, empresa=empresa
            )
        except CuentaPorCobrar.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = CuentaPorCobrar.objects.filter(
            empresa=empresa
        ).select_related('cliente', 'venta')

        if not filters:
            return qs

        if filters.get('estado'):
            qs = qs.filter(estado=filters['estado'])
        if filters.get('cliente'):
            qs = qs.filter(cliente=filters['cliente'])
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

    def create(self, **kwargs) -> CuentaPorCobrar:
        return CuentaPorCobrar.objects.create(**kwargs)

    def save(self, cxc: CuentaPorCobrar) -> CuentaPorCobrar:
        cxc.save()
        return cxc

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            CuentaPorCobrar.objects.filter(empresa=empresa)
            .order_by('-id_cxc')
            .values_list('folio', flat=True)
            .first()
        )
