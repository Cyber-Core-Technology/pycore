from apps.finance.models import PagoProveedor


class PagoProveedorRepository:

    def get_by_id(self, id_pago: int, empresa) -> PagoProveedor | None:
        try:
            return PagoProveedor.objects.get(id_pago=id_pago, empresa=empresa)
        except PagoProveedor.DoesNotExist:
            return None

    def list_by_cxp(self, id_cxp: int):
        return PagoProveedor.objects.filter(cxp=id_cxp).order_by('-fecha_pago')

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = PagoProveedor.objects.filter(empresa=empresa)
        if filters:
            if filters.get('fecha_desde'):
                qs = qs.filter(fecha_pago__gte=filters['fecha_desde'])
            if filters.get('fecha_hasta'):
                qs = qs.filter(fecha_pago__lte=filters['fecha_hasta'])
        return qs

    def create(self, **kwargs) -> PagoProveedor:
        return PagoProveedor.objects.create(**kwargs)

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            PagoProveedor.objects.filter(empresa=empresa)
            .order_by('-id_pago')
            .values_list('folio', flat=True)
            .first()
        )
