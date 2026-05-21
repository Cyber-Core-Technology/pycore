from apps.finance.models import CuentaBancaria


class CuentaBancariaRepository:

    def get_by_id(self, id_cuenta: int, empresa) -> CuentaBancaria | None:
        try:
            return CuentaBancaria.objects.get(
                id_cuenta=id_cuenta, empresa=empresa, activo=True
            )
        except CuentaBancaria.DoesNotExist:
            return None

    def list_by_empresa(self, empresa):
        return CuentaBancaria.objects.filter(empresa=empresa, activo=True)

    def create(self, **kwargs) -> CuentaBancaria:
        return CuentaBancaria.objects.create(**kwargs)

    def save(self, cuenta: CuentaBancaria) -> CuentaBancaria:
        cuenta.save()
        return cuenta

    def get_ultimo_folio(self, empresa) -> str | None:
        return (
            CuentaBancaria.objects.filter(empresa=empresa)
            .order_by('-id_cuenta')
            .values_list('uuid', flat=True)
            .first()
        )
