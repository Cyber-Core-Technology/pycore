import logging
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.finance.repositories import PagoClienteRepository, CxCRepository, CuentaBancariaRepository
from apps.finance.exceptions import (
    CxCNotFoundException, CxCCanceladaException,
    PagoExcedeSaldoException, CuentaBancariaNotFoundException,
)
from apps.finance.events import publicar_pago_cliente_registrado, publicar_cxc_pagada

logger = logging.getLogger(__name__)


class PagoClienteService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = PagoClienteRepository()
        self.cxc_repo = CxCRepository()
        self.cuenta_repo = CuentaBancariaRepository()

    def _generar_folio(self) -> str:
        prefijo = f"PCL-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.repo.get_ultimo_folio(self.empresa)
        if ultimo and ultimo.startswith(prefijo):
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    def listar_por_cxc(self, id_cxc: int):
        return self.repo.list_by_cxc(id_cxc)

    def listar(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    @transaction.atomic
    def registrar_pago(self, data: dict) -> object:
        """
        Flujo:
        1. Validar CxC existe y no está cancelada
        2. Validar monto no excede saldo pendiente
        3. Crear PagoCliente
        4. Reducir saldo_pendiente de CxC
        5. Actualizar estado de CxC (pagada_parcial / pagada)
        6. Actualizar saldo de cuenta bancaria si se especificó
        7. Publicar evento
        """
        cxc = self.cxc_repo.get_by_id(data['id_cxc'], self.empresa)
        if not cxc:
            raise CxCNotFoundException()
        if cxc.estado == 'cancelada':
            raise CxCCanceladaException()

        monto = Decimal(str(data['monto']))
        if monto > cxc.saldo_pendiente:
            raise PagoExcedeSaldoException(
                f"El monto ${monto} excede el saldo pendiente ${cxc.saldo_pendiente}."
            )

        cuenta = None
        if data.get('id_cuenta_bancaria'):
            cuenta = self.cuenta_repo.get_by_id(
                data['id_cuenta_bancaria'], self.empresa
            )
            if not cuenta:
                raise CuentaBancariaNotFoundException()

        pago = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            cxc=cxc,
            cuenta_bancaria=cuenta,
            monto=monto,
            metodo_pago=data['metodo_pago'],
            fecha_pago=data.get('fecha_pago', timezone.now().date()),
            referencia=data.get('referencia', ''),
            notas=data.get('notas', ''),
            created_by=self.usuario,
        )

        # Actualizar CxC
        cxc.saldo_pendiente -= monto
        cxc.actualizar_estado()
        self.cxc_repo.save(cxc)

        # Actualizar saldo bancario
        if cuenta:
            cuenta.saldo_actual += monto
            self.cuenta_repo.save(cuenta)

        # Actualizar credito_disponible del cliente
        cliente = cxc.cliente
        cliente.credito_disponible += monto
        cliente.save(update_fields=['credito_disponible', 'updated_at'])

        publicar_pago_cliente_registrado(pago, cxc)

        if cxc.estado == 'pagada':
            publicar_cxc_pagada(cxc)
            if getattr(cxc, 'venta_id', None):
                from apps.sales.events import publicar_venta_pagada
                publicar_venta_pagada(cxc.venta)

        logger.info(f"✅ Pago cliente registrado: {pago.folio} — ${pago.monto}")
        return pago
