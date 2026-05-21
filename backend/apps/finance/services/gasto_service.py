import logging
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.finance.repositories import GastoRepository, CuentaBancariaRepository
from apps.finance.exceptions import GastoNotFoundException, SaldoInsuficienteException

logger = logging.getLogger(__name__)


class GastoService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = GastoRepository()
        self.cuenta_repo = CuentaBancariaRepository()

    def _generar_folio(self) -> str:
        prefijo = f"GAS-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.repo.get_ultimo_folio(self.empresa)
        if ultimo and ultimo.startswith(prefijo):
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    def listar(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    def obtener(self, id_gasto: int):
        gasto = self.repo.get_by_id(id_gasto, self.empresa)
        if not gasto:
            raise GastoNotFoundException()
        return gasto

    @transaction.atomic
    def registrar(self, data: dict):
        monto = Decimal(str(data['monto']))
        impuesto_monto = Decimal(str(data.get('impuesto_monto', 0)))
        total = monto + impuesto_monto

        cuenta = None
        if data.get('id_cuenta_bancaria'):
            cuenta = self.cuenta_repo.get_by_id(
                data['id_cuenta_bancaria'], self.empresa
            )
            if cuenta and cuenta.saldo_actual < total:
                raise SaldoInsuficienteException(
                    f"Saldo insuficiente en '{cuenta.nombre}'. "
                    f"Disponible: ${cuenta.saldo_actual}, Requerido: ${total}."
                )

        gasto = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            sucursal_id=data.get('id_sucursal'),
            cuenta_bancaria=cuenta,
            concepto=data['concepto'],
            categoria=data.get('categoria', 'otro'),
            monto=monto,
            impuesto_monto=impuesto_monto,
            total=total,
            metodo_pago=data['metodo_pago'],
            fecha_gasto=data.get('fecha_gasto', timezone.now().date()),
            referencia=data.get('referencia', ''),
            notas=data.get('notas', ''),
            created_by=self.usuario,
        )

        if cuenta:
            cuenta.saldo_actual -= total
            self.cuenta_repo.save(cuenta)

        logger.info(f"✅ Gasto registrado: {gasto.folio} — {gasto.concepto} ${gasto.total}")
        return gasto