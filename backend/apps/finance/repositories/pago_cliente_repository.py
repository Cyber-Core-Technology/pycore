from apps.finance.models import PagoCliente


class PagoClienteRepository:

    def get_by_id(self, id_pago: int, empresa) -> PagoCliente | None:
        try:
            return PagoCliente.objects.get(id_pago=id_pago, empresa=empresa)
        except PagoCliente.DoesNotExist:
            return None

    def list_by_cxc(self, id_cxc: int):
        return PagoCliente.objects.filter(cxc=id_cxc).order_by('-fecha_pago')

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = PagoCliente.objects.filter(empresa=empresa)
        if filters:
            if filters.get('fecha_desde'):
                qs = qs.filter(fecha_pago__gte=filters['fecha_desde'])
            if filters.get('fecha_hasta'):
                qs = qs.filter(fecha_pago__lte=filters['fecha_hasta'])
        return qs

    def create(self, **kwargs) -> PagoCliente:
        return PagoCliente.objects.create(**kwargs)

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            PagoCliente.objects.filter(empresa=empresa)
            .order_by('-id_pago')
            .values_list('folio', flat=True)
            .first()
        )
