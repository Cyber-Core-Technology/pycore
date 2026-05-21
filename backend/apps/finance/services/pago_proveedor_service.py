import logging
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.finance.repositories import PagoProveedorRepository, CxPRepository, CuentaBancariaRepository
from apps.finance.exceptions import (
    CxPNotFoundException, CxPCanceladaException,
    PagoExcedeSaldoException, CuentaBancariaNotFoundException,
    SaldoInsuficienteException,
)
from apps.finance.events import publicar_pago_proveedor_registrado, publicar_cxp_pagada

logger = logging.getLogger(__name__)


class PagoProveedorService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = PagoProveedorRepository()
        self.cxp_repo = CxPRepository()
        self.cuenta_repo = CuentaBancariaRepository()

    def _generar_folio(self) -> str:
        prefijo = f"PPR-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.repo.get_ultimo_folio(self.empresa)
        if ultimo and ultimo.startswith(prefijo):
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    def listar_por_cxp(self, id_cxp: int):
        return self.repo.list_by_cxp(id_cxp)

    def listar(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    @transaction.atomic
    def registrar_pago(self, data: dict) -> object:
        """
        Flujo:
        1. Validar CxP existe y no está cancelada
        2. Validar monto no excede saldo pendiente
        3. Validar saldo bancario si se especificó cuenta
        4. Crear PagoProveedor
        5. Reducir saldo_pendiente de CxP
        6. Actualizar estado de CxP
        7. Descontar de cuenta bancaria si se especificó
        8. Publicar evento
        """
        cxp = self.cxp_repo.get_by_id(data['id_cxp'], self.empresa)
        if not cxp:
            raise CxPNotFoundException()
        if cxp.estado == 'cancelada':
            raise CxPCanceladaException()

        monto = Decimal(str(data['monto']))
        if monto > cxp.saldo_pendiente:
            raise PagoExcedeSaldoException(
                f"El monto ${monto} excede el saldo pendiente ${cxp.saldo_pendiente}."
            )

        cuenta = None
        if data.get('id_cuenta_bancaria'):
            cuenta = self.cuenta_repo.get_by_id(
                data['id_cuenta_bancaria'], self.empresa
            )
            if not cuenta:
                raise CuentaBancariaNotFoundException()
            if cuenta.saldo_actual < monto:
                raise SaldoInsuficienteException(
                    f"Saldo insuficiente en cuenta '{cuenta.nombre}'. "
                    f"Disponible: ${cuenta.saldo_actual}, Requerido: ${monto}."
                )

        pago = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            cxp=cxp,
            cuenta_bancaria=cuenta,
            monto=monto,
            metodo_pago=data['metodo_pago'],
            fecha_pago=data.get('fecha_pago', timezone.now().date()),
            referencia=data.get('referencia', ''),
            notas=data.get('notas', ''),
            created_by=self.usuario,
        )

        # Actualizar CxP
        cxp.saldo_pendiente -= monto
        cxp.actualizar_estado()
        self.cxp_repo.save(cxp)

        # Descontar de cuenta bancaria
        if cuenta:
            cuenta.saldo_actual -= monto
            self.cuenta_repo.save(cuenta)

        publicar_pago_proveedor_registrado(pago, cxp)

        if cxp.estado == 'pagada':
            publicar_cxp_pagada(cxp)

        logger.info(f"✅ Pago proveedor registrado: {pago.folio} — ${pago.monto}")
        return pago
