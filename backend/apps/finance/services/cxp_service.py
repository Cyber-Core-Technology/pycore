import logging
from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from apps.finance.repositories import CxPRepository
from apps.finance.exceptions import CxPNotFoundException, CxPCanceladaException
from apps.finance.events import publicar_cxp_creada, publicar_cxp_cancelada

logger = logging.getLogger(__name__)


class CxPService:

    def __init__(self, empresa, usuario=None):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = CxPRepository()

    def _generar_folio(self) -> str:
        prefijo = f"CXP-{timezone.now().strftime('%Y%m')}-"
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

    def obtener(self, id_cxp: int):
        cxp = self.repo.get_by_id(id_cxp, self.empresa)
        if not cxp:
            raise CxPNotFoundException()
        return cxp

    @transaction.atomic
    def crear_desde_compra(self, compra) -> object:
        """
        Crea CxP automáticamente a partir de una compra recibida.
        Llamado desde el endpoint manual o futuro event handler.
        """
        proveedor = compra.proveedor

        fecha_vencimiento = (
            compra.fecha_vencimiento or
            timezone.now().date() + timedelta(days=proveedor.dias_credito or 30)
        )

        cxp = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            proveedor=proveedor,
            compra=compra,
            monto_original=compra.total,
            saldo_pendiente=compra.total,
            fecha_vencimiento=fecha_vencimiento,
            estado='pendiente',
            created_by=self.usuario,
        )

        publicar_cxp_creada(cxp)
        logger.info(f"✅ CxP creada: {cxp.folio} — ${cxp.monto_original}")
        return cxp

    @transaction.atomic
    def cancelar(self, id_cxp: int) -> object:
        cxp = self.obtener(id_cxp)
        if cxp.estado == 'cancelada':
            raise CxPCanceladaException()
        cxp.estado = 'cancelada'
        self.repo.save(cxp)
        publicar_cxp_cancelada(cxp)
        logger.info(f"✅ CxP cancelada: {cxp.folio}")
        return cxp
